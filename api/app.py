from io import BytesIO
from flask import Flask, request, send_file, jsonify
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from pymongo import MongoClient
from bson import ObjectId
import pypdf
import os
import hashlib
import json
from dotenv import load_dotenv
from datetime import datetime, timedelta, UTC

load_dotenv()

from gemini import mutate_prompt, detect_indicators, generate_rubric_suggestions, grade_with_rubric, analyze_interview_transcript
from flask_cors import CORS

app = Flask(__name__)

# Configure CORS to allow Next.js dev server
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# MongoDB setup
mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(mongo_uri)
db = mongo_client["lms"]
homeworks_col = db["homeworks"]
submissions_col = db["submissions"]
courses_col = db["courses"]
assignments_col = db["assignments"]
users_col = db["users"]
cache_col = db["cache"]

# PDF cache directory
PDF_CACHE_DIR = os.path.join(os.path.dirname(__file__), "pdf_cache")
os.makedirs(PDF_CACHE_DIR, exist_ok=True)


def _hash_key(parts):
    joined = "||".join([str(p) for p in parts])
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def cache_get(key: str):
    doc = cache_col.find_one({"key": key, "expiresAt": {"$gt": datetime.now(UTC)}})
    return doc.get("value") if doc else None


def cache_set(key: str, value, ttl_seconds: int = 3600):
    cache_col.update_one(
        {"key": key},
        {
            "$set": {
                "key": key,
                "value": value,
                "createdAt": datetime.now(UTC),
                "expiresAt": datetime.now(UTC) + timedelta(seconds=ttl_seconds)
            }
        },
        upsert=True
    )


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from PDF bytes."""
    pdf_file = BytesIO(pdf_bytes)
    reader = pypdf.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text


def build_secret_replacement_pdf(visible_text: str, secret_text: str, output_path: str) -> bytes:
    """
    Generate a PDF with visible text but with secret text replacement via marked content.
    The visible_text is what appears on screen, secret_text is what copy/paste/accessibility sees.
    """
    # Normalize text to avoid ReportLab encoding issues with standard fonts
    replacements = {
        '\u201c': '"', '\u201d': '"',  # Smart quotes
        '\u2018': "'", '\u2019': "'",  # Smart single quotes
        '\u2013': '-', '\u2014': '-'   # Dashes
    }
    for k, v in replacements.items():
        if visible_text:
            visible_text = visible_text.replace(k, v)
        if secret_text:
            secret_text = secret_text.replace(k, v)

    page_size = letter
    font_size = 12
    margin = 50
    line_height = font_size * 1.2
    font_name = "Times-Roman"  # Reason: common assignment font
    
    # Use BytesIO if no output path specified
    if output_path is None:
        output_buffer = BytesIO()
        c = canvas.Canvas(output_buffer, pagesize=page_size)
    else:
        c = canvas.Canvas(output_path, pagesize=page_size)
    
    c.setFont(font_name, font_size)
    
    # Layout: wrap text to fit page width, respecting newlines
    lines = []
    
    # Normalize newlines
    paragraphs = visible_text.replace('\r\n', '\n').split('\n')
    
    max_width = page_size[0] - 2 * margin
    space_w = c.stringWidth(" ", font_name, font_size)
    
    for p_idx, paragraph in enumerate(paragraphs):
        # If paragraph is empty, it's a blank line
        if not paragraph.strip():
            lines.append([])
            continue
            
        words = paragraph.split()
        current_line = []
        current_width = 0
        
        for word in words:
            w_w = c.stringWidth(word, font_name, font_size)
            if current_width + w_w > max_width and current_line:
                lines.append(current_line)
                current_line = [word]
                current_width = w_w + space_w
            else:
                current_line.append(word)
                current_width += w_w + space_w
        if current_line:
            lines.append(current_line)

    # Filter for non-empty lines to distribute secret text
    non_empty_line_indices = [i for i, l in enumerate(lines) if l]
    num_content_lines = len(non_empty_line_indices)
    
    if num_content_lines == 0:
        c.save()
        if output_path is None:
            output_buffer.seek(0)
            return output_buffer.getvalue()
        return True
    
    # Distribute secret_text across NON-EMPTY lines
    target_words = secret_text.split()
    total_len = len(secret_text)
    ideal_len = total_len / num_content_lines if num_content_lines > 0 else 0
    
    chunks = []
    current_chunk_words = []
    current_len = 0
    word_idx = 0
    n_words = len(target_words)
    
    for i in range(num_content_lines - 1):
        if word_idx >= n_words:
            chunks.append("")
            continue
        
        while word_idx < n_words:
            word = target_words[word_idx]
            w_len = len(word)
            
            if len(current_chunk_words) == 0:
                current_chunk_words.append(word)
                current_len += w_len
                word_idx += 1
            elif current_len + 1 + w_len <= ideal_len * 1.2:
                current_chunk_words.append(word)
                current_len += 1 + w_len
                word_idx += 1
            else:
                break
        
        chunks.append(" ".join(current_chunk_words))
        current_chunk_words = []
        current_len = 0
    
    # Last content line gets the rest
    if word_idx < n_words:
        chunks.append(" ".join(target_words[word_idx:]))
    else:
        chunks.append("")
    
    # Map chunks back to line indices
    line_to_chunk = {line_idx: chunk for line_idx, chunk in zip(non_empty_line_indices, chunks)}
    
    # Draw lines
    y = page_size[1] - margin
    for i, line_words in enumerate(lines):
        # Check if we need new page
        if y < margin:
            c.showPage()
            c.setFont(font_name, font_size)
            y = page_size[1] - margin

        if not line_words:
            # Empty line, just spacing
            y -= line_height
            continue
            
        x = margin
        line_str = " ".join(line_words)
        
        # Get corresponding secret chunk
        chunk = line_to_chunk.get(i, "")
        if not chunk:
            chunk = " "
        
        # Escape special PDF characters
        esc_chunk = chunk.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        
        # Inject marked content with ActualText
        c._code.append(f"/Span <</ActualText ({esc_chunk})>> BDC")
        c.drawString(x, y, line_str)
        c._code.append("EMC")
        
        y -= line_height
    
    c.save()
    
    if output_path is None:
        output_buffer.seek(0)
        return output_buffer.getvalue()
    return True


@app.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint."""
    return jsonify({
        "status": "ok",
        "service": "lms-python-api",
        "timestamp": str(datetime.now())
    })


@app.route("/generate", methods=["POST"])
def generate():
    """Generate a homework PDF with invisible mutation for integrity checking."""
    print(f"[GENERATE] Received request")

    data = request.get_json(silent=True) or {}
    visible_text = data.get("visible_text")
    teacher_id = data.get("teacher_id")
    assignment_id = data.get("assignment_id")

    print(f"[GENERATE] teacher_id={teacher_id}, assignment_id={assignment_id}, text_length={len(visible_text) if visible_text else 0}")

    if not isinstance(visible_text, str) or len(visible_text) == 0:
        print("[GENERATE] Error: Invalid visible_text")
        return jsonify({"error": "Provide JSON with 'visible_text': string, 'teacher_id': string, 'assignment_id': string"}), 400

    try:
        # Use Gemini to suggest mutations
        print("[GENERATE] Calling Gemini API...")
        mutation_result = mutate_prompt(prompt_text=visible_text)
        mutated_text = mutation_result["mutated"]
        mutations = mutation_result["mutations"]
        changes = mutation_result["changes"]
        print(f"[GENERATE] Gemini returned {len(mutations)} mutations")

        # Generate PDF with visible/invisible split
        print("[GENERATE] Building PDF...")
        pdf_bytes = build_secret_replacement_pdf(visible_text=visible_text, secret_text=mutated_text, output_path=None)
        print(f"[GENERATE] PDF generated: {len(pdf_bytes)} bytes")

        # Store homework metadata in MongoDB
        print("[GENERATE] Storing in MongoDB...")
        homework_doc = {
            "teacher_id": teacher_id,
            "assignment_id": assignment_id,
            "original_prompt": visible_text,
            "mutated_prompt": mutated_text,
            "mutations": mutations,
            "changes": changes
        }
        result = homeworks_col.insert_one(homework_doc)
        homework_id = str(result.inserted_id)
        print(f"[GENERATE] Success! homework_id={homework_id}")

        return jsonify({
            "homework_id": homework_id,
            "original_prompt": visible_text,
            "mutated_prompt": mutated_text,
            "mutations": mutations,
            "changes": changes,
            "pdf_download": "/download/" + homework_id
        })
    except Exception as e:
        print(f"[GENERATE] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/submit", methods=["POST"])
def submit():
    """Student submits their response (PDF or text) for integrity analysis."""
    data = request.form.to_dict()
    homework_id = data.get("homework_id")
    student_id = data.get("student_id")
    
    # Get uploaded file (PDF or text)
    file = request.files.get("file")
    response_text = data.get("response_text", "")
    
    if not homework_id or not student_id:
        return jsonify({"error": "Provide homework_id and student_id"}), 400
    
    # Retrieve homework metadata
    try:
        homework = homeworks_col.find_one({"_id": ObjectId(homework_id)})
    except:
        return jsonify({"error": "Invalid homework ID"}), 400
    
    if not homework:
        return jsonify({"error": "Homework not found"}), 404
    
    # Extract text from file if provided, else use response_text
    if file:
        try:
            pdf_bytes = file.read()
            response_text = extract_text_from_pdf(pdf_bytes=pdf_bytes)
        except:
            return jsonify({"error": "Failed to extract text from PDF"}), 400
    
    if not response_text:
        return jsonify({"error": "No response text provided"}), 400
    
    # Create cache key for detection
    cache_key = _hash_key(["detect", homework_id, response_text])
    cached_analysis = cache_get(cache_key)
    
    if cached_analysis:
        print(f"[SUBMIT] Using cached detection result for {cache_key}")
        analysis = cached_analysis
    else:
        # Detect indicators in submission
        analysis = detect_indicators(
            student_text=response_text,
            original_prompt=homework["original_prompt"],
            secret_prompt=homework["mutated_prompt"],
            changes=homework.get("changes", [])
        )
        cache_set(cache_key, analysis, ttl_seconds=3600*24) # 24 hour cache for submissions
    
    # Store submission and analysis in MongoDB
    submission_doc = {
        "homework_id": homework_id,
        "student_id": student_id,
        "response_text": response_text,
        "analysis": analysis
    }
    submissions_col.insert_one(submission_doc)
    
    return jsonify(analysis)


@app.route("/download/<homework_id>", methods=["GET"])
def download(homework_id: str):
    """Download the homework PDF (for students)."""
    try:
        homework = homeworks_col.find_one({"_id": ObjectId(homework_id)})
    except:
        return jsonify({"error": "Invalid homework ID"}), 400
    
    if not homework:
        return jsonify({"error": "Homework not found"}), 404
    
    pdf_bytes = build_secret_replacement_pdf(
        visible_text=homework["original_prompt"],
        secret_text=homework["mutated_prompt"],
        output_path=None
    )
    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name="homework.pdf"
    )


@app.route("/detect", methods=["POST"])
def detect():
    """Analyze student submission for specific indicators of LLM use."""
    original_prompt = request.form.get("original_prompt")
    secret_prompt = request.form.get("secret_prompt")
    changes = request.form.getlist("changes")
    
    file = request.files.get("file")
    student_text = request.form.get("student_text", "")
    
    if not original_prompt or not secret_prompt or not changes:
        return jsonify({"error": "Provide original_prompt, secret_prompt, and changes (list)"}), 400
    
    # Extract text from file if provided, else use student_text
    if file:
        try:
            pdf_bytes = file.read()
            student_text = extract_text_from_pdf(pdf_bytes=pdf_bytes)
        except:
            return jsonify({"error": "Failed to extract text from PDF"}), 400
    
    if not student_text:
        return jsonify({"error": "No student text provided"}), 400
    
    # Create cache key
    cache_key = _hash_key(["detect-standalone", original_prompt, secret_prompt, str(changes), student_text])
    cached_result = cache_get(cache_key)
    
    if cached_result:
        print(f"[DETECT] Using cached result for {cache_key}")
        return jsonify(cached_result)

    # Detect indicators
    detection_result = detect_indicators(
        student_text=student_text,
        original_prompt=original_prompt,
        secret_prompt=secret_prompt,
        changes=changes
    )
    cache_set(cache_key, detection_result, ttl_seconds=3600*24)
    
    return jsonify(detection_result)


@app.route("/api/courses", methods=["GET"])
def get_courses():
    """Get courses for a teacher."""
    teacher_id = request.args.get("teacherId")
    
    print(f"[FLASK] /api/courses called with teacherId: {teacher_id}")
    
    if not teacher_id:
        print("[FLASK] Error: teacherId missing")
        return jsonify({"error": "teacherId required"}), 400
    
    # teacher_id is now a Clerk user ID (string), not ObjectId
    print(f"[FLASK] Querying courses with professorId: {teacher_id}")
    courses = list(courses_col.find({"professorId": teacher_id}))
    
    print(f"[FLASK] Found {len(courses)} courses")
    for course in courses:
        print(f"[FLASK] Course: {course.get('name')} (ID: {course['_id']}, Prof: {course.get('professorId')})")
    
    # Add counts
    for course in courses:
        course["_id"] = str(course["_id"])
        # professorId is already a string (Clerk ID)
        course["studentCount"] = len(course.get("enrolledStudents", []))
        course["assignmentCount"] = assignments_col.count_documents({"courseId": ObjectId(course["_id"])})
    
    # Calculate stats
    total_assignments = sum(c["assignmentCount"] for c in courses)
    total_submissions = submissions_col.count_documents({"teacherId": teacher_id})
    pending_reviews = submissions_col.count_documents({
        "teacherId": teacher_id,
        "needsInterview": True,
        "interviewCompleted": {"$ne": True}
    })
    
    print(f"[FLASK] Returning {len(courses)} courses with stats: {total_assignments} assignments, {total_submissions} submissions, {pending_reviews} pending")
    
    return jsonify({
        "courses": courses,
        "stats": {
            "totalAssignments": total_assignments,
            "totalSubmissions": total_submissions,
            "pendingReviews": pending_reviews
        }
    })


@app.route("/api/courses/<course_id>", methods=["GET"])
def get_course(course_id):
    """Get a single course by ID."""
    try:
        course = courses_col.find_one({"_id": ObjectId(course_id)})
        
        if not course:
            return jsonify({"error": "Course not found"}), 404
        
        course["_id"] = str(course["_id"])
        # professorId is already a string (Clerk ID)
        course["studentCount"] = len(course.get("enrolledStudents", []))
        course["assignmentCount"] = assignments_col.count_documents({"courseId": ObjectId(course_id)})
        
        return jsonify({"course": course})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/courses/<course_id>/assignments", methods=["GET", "POST"])
def course_assignments(course_id):
    """Get or create assignments for a course."""
    
    if request.method == "GET":
        try:
            assignments = list(assignments_col.find({
                "courseId": ObjectId(course_id),
                "status": {"$ne": "deleted"}
            }))
            
            for assignment in assignments:
                assignment["_id"] = str(assignment["_id"])
                assignment["courseId"] = str(assignment["courseId"])
                assignment["professorId"] = str(assignment["professorId"])
                assignment["submissionCount"] = submissions_col.count_documents({
                    "assignmentId": ObjectId(assignment["_id"])
                })
            
            return jsonify({"assignments": assignments})
        except Exception as e:
            return jsonify({"error": str(e), "assignments": []}), 500
    
    elif request.method == "POST":
        try:
            data = request.json
            
            assignment = {
                "courseId": ObjectId(course_id),
                "professorId": data.get("teacherId"),  # Clerk user ID (string)
                "title": data.get("title"),
                "description": data.get("description", ""),
                "instructions": data.get("instructions"),
                "dueDate": datetime.fromisoformat(data.get("dueDate").replace("Z", "+00:00")),
                "maxScore": data.get("maxScore", 100),
                "status": data.get("status", "open"),
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            }
            
            result = assignments_col.insert_one(assignment)
            assignment["_id"] = str(result.inserted_id)
            assignment["courseId"] = str(assignment["courseId"])
            # professorId is already a string
            assignment["submissionCount"] = 0
            
            return jsonify({"assignment": assignment}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/<assignment_id>/pdf", methods=["GET"])
def get_assignment_pdf(assignment_id):
    """Generate or retrieve cached assignment PDF with mutation markers."""
    try:
        # Check if assignment exists
        assignment = assignments_col.find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            return jsonify({"error": "Assignment not found"}), 404
        
        # Check cache first
        pdf_filename = f"{assignment_id}.pdf"
        pdf_path = os.path.join(PDF_CACHE_DIR, pdf_filename)
        
        # Check if we have stored mutation data for this assignment
        homework = homeworks_col.find_one({"assignment_id": assignment_id})
        
        if os.path.exists(pdf_path) and homework:
            # Return cached PDF
            print(f"[PDF] Returning cached PDF for assignment {assignment_id}")
            return send_file(
                pdf_path,
                mimetype="application/pdf",
                as_attachment=True,
                download_name=f"{assignment.get('title', 'assignment')}.pdf"
            )
        
        visible_text = assignment.get("instructions", "")

        # If we have homework metadata but no PDF, use the metadata to regenerate PDF
        if homework:
            print(f"[PDF] Regenerating PDF from existing audit info for {assignment_id}")
            mutated_text = homework["mutated_prompt"]
            mutations = homework.get("mutations", [])
            changes = homework.get("changes", [])
        else:
            # Generate new PDF with mutations
            print(f"[PDF] Generating new PDF for assignment {assignment_id}")
            
            # Use Gemini to create mutated version
            from gemini import mutate_prompt
            mutation_result = mutate_prompt(prompt_text=visible_text)
            mutated_text = mutation_result["mutated"]
            mutations = mutation_result["mutations"]
            changes = mutation_result["changes"]

        # Generate PDF
        pdf_bytes = build_secret_replacement_pdf(
            visible_text=visible_text,
            secret_text=mutated_text,
            output_path=None
        )
        
        # Save to cache
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)
        
        # Store mutation metadata
        if homework:
            # Update existing (just the PDF path and timestamp)
            homeworks_col.update_one(
                {"assignment_id": assignment_id},
                {"$set": {
                    "pdf_path": pdf_path,
                    "updated_at": datetime.now()
                }}
            )
        else:
            # Create new
            homeworks_col.insert_one({
                "assignment_id": assignment_id,
                "teacher_id": assignment.get("professorId"),
                "course_id": str(assignment.get("courseId")),
                "original_prompt": visible_text,
                "mutated_prompt": mutated_text,
                "mutations": mutations,
                "changes": changes,
                "pdf_path": pdf_path,
                "created_at": datetime.now()
            })
        
        print(f"[PDF] PDF generated and cached at {pdf_path}")
        
        return send_file(
            BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{assignment.get('title', 'assignment')}.pdf"
        )
        
    except Exception as e:
        print(f"[PDF] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/<assignment_id>", methods=["GET", "PUT"])
def get_assignment(assignment_id):
    """Get or update a single assignment by ID."""
    if request.method == "GET":
        try:
            assignment = assignments_col.find_one({"_id": ObjectId(assignment_id)})
            
            if not assignment:
                return jsonify({"error": "Assignment not found"}), 404
            
            assignment["_id"] = str(assignment["_id"])
            assignment["courseId"] = str(assignment["courseId"])

            # Attach audit info if available
            homework = homeworks_col.find_one({"assignment_id": assignment_id})
            if homework:
                assignment["mutations"] = homework.get("mutations", [])
                assignment["mutated_prompt"] = homework.get("mutated_prompt", "")
            
            return jsonify({"assignment": assignment})
        except Exception as e:
            print(f"[ASSIGNMENT] Error: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    else:  # PUT
        try:
            data = request.json or {}
            content = data.get("content")
            
            if not content:
                return jsonify({"error": "Content is required"}), 400
            
            # Regenerate mutations for the new content
            print(f"[ASSIGNMENT] Regenerating mutations for assignment {assignment_id}")
            from gemini import mutate_prompt # Ensure mutate_prompt is available
            mutation_result = mutate_prompt(prompt_text=content)
            mutated_text = mutation_result["mutated"]
            mutations = mutation_result["mutations"]
            changes = mutation_result["changes"]
            
            # Update homework metadata in MongoDB
            homework_doc = {
                "assignment_id": assignment_id,
                "original_prompt": content,
                "mutated_prompt": mutated_text,
                "mutations": mutations,
                "changes": changes
            }
            
            homeworks_col.update_one(
                {"assignment_id": assignment_id},
                {"$set": homework_doc},
                upsert=True
            )
            
            # Update assignment content
            assignments_col.update_one(
                {"_id": ObjectId(assignment_id)},
                {"$set": {"instructions": content, "updatedAt": datetime.now(UTC)}} # Changed 'content' to 'instructions' to match schema
            )
            
            return jsonify({
                "success": True,
                "mutations": mutations,
                "changes": changes
            })
        except Exception as e:
            print(f"[ASSIGNMENT] Update error: {str(e)}")
            return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/<assignment_id>/submissions", methods=["GET"])
def get_assignment_submissions(assignment_id):
    """Get all submissions for an assignment."""
    try:
        submissions = list(submissions_col.find({"assignmentId": ObjectId(assignment_id)}))
        
        for submission in submissions:
            submission["_id"] = str(submission["_id"])
            submission["assignmentId"] = str(submission["assignmentId"])
            # Convert any other ObjectId fields that might exist
            if "teacherId" in submission and isinstance(submission["teacherId"], ObjectId):
                submission["teacherId"] = str(submission["teacherId"])
            if "interviewResult" in submission and submission["interviewResult"]:
                if "_id" in submission["interviewResult"] and isinstance(submission["interviewResult"]["_id"], ObjectId):
                    submission["interviewResult"]["_id"] = str(submission["interviewResult"]["_id"])
        
        print(f"[SUBMISSIONS] Found {len(submissions)} submissions for assignment {assignment_id}")
        return jsonify({"submissions": submissions})
    except Exception as e:
        print(f"[SUBMISSIONS] Error: {str(e)}")
        return jsonify({"error": str(e), "submissions": []}), 500


@app.route("/api/assignments/<assignment_id>/status", methods=["PATCH"])
def update_assignment_status(assignment_id):
    """Update assignment status: open, hidden, or deleted."""
    data = request.json or {}
    status = data.get("status")
    if status not in ["open", "hidden", "deleted"]:
        return jsonify({"error": "Invalid status. Must be open, hidden, or deleted"}), 400
    try:
        result = assignments_col.update_one(
            {"_id": ObjectId(assignment_id)},
            {"$set": {"status": status, "updatedAt": datetime.now(UTC)}}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Assignment not found"}), 404
        assignment = assignments_col.find_one({"_id": ObjectId(assignment_id)})
        assignment["_id"] = str(assignment["_id"])
        assignment["courseId"] = str(assignment["courseId"])
        return jsonify({"assignment": assignment})
    except Exception as e:
        print(f"[STATUS] Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/assignments/rubric/generate", methods=["POST"])
def generate_rubric():
    data = request.json or {}
    instructions = data.get("instructions", "")
    title = data.get("title", "")
    if not instructions:
        return jsonify({"error": "instructions required"}), 400
    cache_key = _hash_key(["rubric_gen", instructions])
    cached = cache_get(cache_key)
    if cached:
        return jsonify({"rubric": cached, "cached": True})
    rubric = generate_rubric_suggestions(instructions=instructions, title=title)
    cache_set(cache_key, rubric, ttl_seconds=3600)
    return jsonify({"rubric": rubric, "cached": False})


@app.route("/api/assignments/<assignment_id>/rubric", methods=["GET", "PUT"])
def assignment_rubric(assignment_id):
    if request.method == "GET":
        assignment = assignments_col.find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            return jsonify({"error": "Assignment not found"}), 404
        rubric = assignment.get("rubric", [])
        visible = assignment.get("rubricVisibleToStudents", False)
        total = sum(item.get("maxPoints", 0) for item in rubric)
        return jsonify({"rubric": rubric, "visibleToStudents": visible, "totalPoints": total})
    else:
        data = request.json or {}
        
        update_fields = {"updatedAt": datetime.now(UTC)}
        
        if "rubric" in data:
            rubric = data["rubric"]
            total = sum(item.get("maxPoints", 0) for item in rubric)
            update_fields["rubric"] = rubric
            update_fields["totalPoints"] = total
            
        if "visibleToStudents" in data:
            update_fields["rubricVisibleToStudents"] = bool(data["visibleToStudents"])

        assignments_col.update_one(
            {"_id": ObjectId(assignment_id)},
            {"$set": update_fields}
        )
        
        # Return updated document state
        updated = assignments_col.find_one({"_id": ObjectId(assignment_id)})
        return jsonify({
            "rubric": updated.get("rubric", []), 
            "visibleToStudents": updated.get("rubricVisibleToStudents", False),
            "totalPoints": updated.get("totalPoints", 0)
        })


def _grade_submission(submission_id):
    submission = submissions_col.find_one({"_id": ObjectId(submission_id)})
    if not submission:
        return {"error": "Submission not found", "status": 404}
    assignment = assignments_col.find_one({"_id": ObjectId(submission.get("assignmentId"))})
    if not assignment:
        return {"error": "Assignment not found", "status": 404}
    rubric = assignment.get("rubric", [])
    if not rubric:
        return {"error": "Rubric not configured", "status": 400}
    submission_text = submission.get("submittedText")
    if not submission_text:
        return {"error": "No submission text to grade", "status": 400}

    rubric_hash = _hash_key(["rubric", json.dumps(rubric, sort_keys=True)])
    cache_key = _hash_key(["grade", rubric_hash, submission_text])
    cached = cache_get(cache_key)
    if cached:
        return {"result": cached, "cached": True, "status": 200}

    grading = grade_with_rubric(submission_text=submission_text, rubric=rubric, instructions=assignment.get("instructions", ""))
    criteria_results = grading.get("criteria", [])
    # attach maxPoints
    rubric_map = {item.get("id") or item.get("criterion"): item for item in rubric}
    final_criteria = []
    total_score = 0
    total_max = 0
    for item in rubric:
        cid = item.get("id") or item.get("criterion")
        matched = next((c for c in criteria_results if c.get("criterionId") == cid), None)
        earned = matched.get("pointsEarned", 0) if matched else 0
        max_pts = item.get("maxPoints", 0)
        total_score += earned
        total_max += max_pts
        final_criteria.append({
            "criterionId": cid,
            "criterion": item.get("criterion"),
            "maxPoints": max_pts,
            "pointsEarned": earned,
            "justification": (matched.get("justification") if matched else "")
        })

    result = {
        "totalScore": total_score,
        "maxScore": total_max,
        "gradedAt": datetime.now(UTC).isoformat(),
        "criteria": final_criteria
    }

    submissions_col.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {"autoGrade": result, "updatedAt": datetime.now(UTC)}}
    )
    cache_set(cache_key, result, ttl_seconds=3600)
    return {"result": result, "cached": False, "status": 200}


@app.route("/api/submissions/<submission_id>/auto-grade", methods=["POST"])
def auto_grade_submission(submission_id):
    out = _grade_submission(submission_id)
    if "error" in out:
        return jsonify({"error": out["error"]}), out.get("status", 500)
    return jsonify({"autoGrade": out["result"], "cached": out.get("cached", False)})


@app.route("/api/submissions/<submission_id>/grade", methods=["GET"])
def get_submission_grade(submission_id):
    submission = submissions_col.find_one({"_id": ObjectId(submission_id)})
    if not submission:
        return jsonify({"error": "Submission not found"}), 404
    if submission.get("autoGrade"):
        return jsonify({"autoGrade": submission.get("autoGrade"), "cached": True})
    out = _grade_submission(submission_id)
    if "error" in out:
        return jsonify({"error": out["error"]}), out.get("status", 500)
    return jsonify({"autoGrade": out["result"], "cached": out.get("cached", False)})


@app.route("/api/submissions/<submission_id>/manual-grade", methods=["POST"])
def save_manual_grade(submission_id):
    """Save teacher's manual grade for a submission."""
    data = request.json or {}
    criteria = data.get("criteria", [])
    total_score = data.get("totalScore", 0)
    teacher_id = data.get("teacherId")
    
    if not criteria:
        return jsonify({"error": "No criteria provided"}), 400
    
    try:
        submission = submissions_col.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            return jsonify({"error": "Submission not found"}), 404
        
        manual_grade = {
            "totalScore": total_score,
            "criteria": criteria,
            "gradedAt": datetime.now(UTC).isoformat(),
            "gradedBy": teacher_id
        }
        
        submissions_col.update_one(
            {"_id": ObjectId(submission_id)},
            {
                "$set": {
                    "manualGrade": manual_grade,
                    "score": total_score,
                    "updatedAt": datetime.now(UTC)
                }
            }
        )
        
        return jsonify({"success": True, "manualGrade": manual_grade})
    
    except Exception as e:
        print(f"[MANUAL-GRADE] Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/submissions/<submission_id>", methods=["GET"])
def get_submission(submission_id):
    """Get a single submission by ID."""
    try:
        submission = submissions_col.find_one({"_id": ObjectId(submission_id)})
        
        if not submission:
            return jsonify({"error": "Submission not found"}), 404
        
        submission["_id"] = str(submission["_id"])
        submission["assignmentId"] = str(submission["assignmentId"])
        
        # Backward-compat: unify response text field
        # Prefer 'submittedText', fall back to legacy 'submissionText' or 'response_text'
        unified_text = (
            submission.get("submittedText")
            or submission.get("submissionText")
            or submission.get("response_text")
        )
        if unified_text is not None:
            submission["submittedText"] = unified_text
            submission["response_text"] = unified_text

        # Ensure indicatorsFound has the correct structure
        if "indicatorsFound" in submission and submission["indicatorsFound"]:
            indicators = submission["indicatorsFound"]
            # Only keep indicators that have required fields
            submission["indicatorsFound"] = [
                ind for ind in indicators 
                if ind.get("type") and ind.get("evidence") and ind.get("location")
            ]
        
        return jsonify({"submission": submission})
    except Exception as e:
        print(f"[SUBMISSION] Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/submissions/<submission_id>/transcript", methods=["POST"])
def save_transcript(submission_id):
    """Save interview transcript and analyze it."""
    data = request.json or {}
    transcript = data.get("transcript", [])
    
    if not transcript:
        return jsonify({"error": "No transcript provided"}), 400

    try:
        submission = submissions_col.find_one({"_id": ObjectId(submission_id)})
        if not submission:
            return jsonify({"error": "Submission not found"}), 404
        
        # Analyze the interview
        analysis = analyze_interview_transcript(
            transcript=transcript,
            submission_text=submission.get("response_text", "")
        )
        
        # Determine status based on score
        # Using exact user requirements: <50 = suspicious, >50 = verified
        score = analysis.get("score", 0)
        new_status = "flagged" if score < 50 else "verified"
        
        update_fields = {
            "interviewTranscript": transcript,
            "interviewScore": score,
            "interviewReasoning": analysis.get("reasoning", ""),
            "interviewVerdict": analysis.get("verdict", "UNCLEAR"),
            "interviewCompleted": True,
            "updatedAt": datetime.now(UTC)
        }
        
        # Only update status if it was previously flagged/suspicious
        if submission.get("status") == "flagged":
             update_fields["status"] = new_status

        submissions_col.update_one(
            {"_id": ObjectId(submission_id)},
            {"$set": update_fields}
        )
        
        return jsonify({
            "success": True,
            "analysis": analysis,
            "newStatus": new_status
        })

    except Exception as e:
        print(f"[TRANSCRIPT] Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":


    mode = os.environ.get("MODE", "serve")
    if mode == "write":
        sample = build_secret_replacement_pdf(visible_text="Hello visible world", secret_text="Hello hidden world", output_path=None)
        with open("secret_replacement_sample.pdf", "wb") as f:
            f.write(sample)
        print("Wrote secret_replacement_sample.pdf")
    else:
        app.run(host="127.0.0.1", port=5000)
