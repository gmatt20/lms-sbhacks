#!/usr/bin/env python3
"""
Seed script to populate MongoDB with sample LMS data.
Run with: python scripts/seed_db.py
"""

import os
import sys
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path to import from api
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")

def seed_database():
    """Populate the database with sample courses and assignments."""
    
    client = MongoClient(MONGO_URI)
    db = client["lms"]
    
    # Clear existing data
    print("Clearing existing data...")
    db.courses.delete_many({})
    db.assignments.delete_many({})
    db.submissions.delete_many({})
    
    # Note: Users are managed by Clerk, not MongoDB
    # We'll reference Clerk user IDs in our courses/assignments
    
    # Actual Clerk user IDs from the dashboard
    print("Using actual Clerk user IDs...")
    teacher1_clerk_id = "user_3860EL7WeRMr3h5Z0aUBhD9gQkb"
    teacher2_clerk_id = "user_3860EL7WeRMr3h5Z0aUBhD9gQkb"  # Same teacher for now
    student1_clerk_id = "user_3860ZnBXCboxu4fQV9a2KgOAJI6"
    student2_clerk_id = "user_3860VYcoSXUS6WpLjBkm2bUy5EU"
    student3_clerk_id = "user_3860IgwpS4QlnYfPRDh38uqQA0b"
    
    # Create sample courses
    print("Creating sample courses...")
    course1_id = ObjectId()
    course2_id = ObjectId()
    
    courses = [
        {
            "_id": course1_id,
            "code": "ENG 11",
            "name": "American Literature",
            "description": "Survey of American literature from the Colonial period to present, focusing on major themes, authors, and literary movements.",
            "professorId": teacher1_clerk_id,
            "semester": "Spring 2026",
            "enrolledStudents": [student1_clerk_id, student2_clerk_id, student3_clerk_id],
            "createdAt": datetime.now(),
        },
        {
            "_id": course2_id,
            "code": "HIST 10",
            "name": "Modern World History",
            "description": "Examination of major global events, movements, and transformations from 1900 to present, with emphasis on critical thinking and historical analysis.",
            "professorId": teacher1_clerk_id,
            "semester": "Spring 2026",
            "enrolledStudents": [student1_clerk_id, student2_clerk_id, student3_clerk_id],
            "createdAt": datetime.now(),
        },
    ]
    db.courses.insert_many(courses)
    
    # Create sample assignments
    print("Creating sample assignments...")
    now = datetime.now()
    
    assignment1_id = ObjectId()
    assignment2_id = ObjectId()
    assignment3_id = ObjectId()
    assignment4_id = ObjectId()
    
    assignments = [
        {
            "_id": assignment1_id,
            "courseId": course1_id,
            "professorId": teacher1_clerk_id,
            "title": "The American Dream in Modern Literature",
            "description": "Analytical essay examining the concept of the American Dream through literary works.",
            "instructions": """AMERICAN LITERATURE - ESSAY ASSIGNMENT

TOPIC: The Evolution of the American Dream in 20th Century Literature

OVERVIEW:
For this assignment, you will write a 5-7 page analytical essay examining how the concept of the "American Dream" is portrayed in at least three different American literary works from the 20th century. Your essay should demonstrate critical thinking, close reading skills, and the ability to synthesize ideas across multiple texts.

REQUIRED TEXTS (Choose at least 3):
- F. Scott Fitzgerald's "The Great Gatsby" (1925)
- Arthur Miller's "Death of a Salesman" (1949)
- Lorraine Hansberry's "A Raisin in the Sun" (1959)
- Toni Morrison's "The Bluest Eye" (1970)
- Sandra Cisneros's "The House on Mango Street" (1984)

ASSIGNMENT REQUIREMENTS:

1. THESIS STATEMENT (1 paragraph):
   - Develop a clear, arguable thesis that makes a specific claim about how these authors represent, challenge, or redefine the American Dream
   - Your thesis should go beyond simple summary to offer interpretation and insight

2. TEXTUAL ANALYSIS (4-5 pages):
   - Provide close readings of specific passages from each text
   - Use direct quotations to support your arguments (properly cited in MLA format)
   - Analyze literary devices such as symbolism, metaphor, characterization, and narrative structure
   - Make connections between the texts, showing how they speak to each other
   - Consider historical context: how do the time periods in which these works were written influence their portrayal of the American Dream?

3. CRITICAL ENGAGEMENT (1-2 pages):
   - Incorporate at least TWO scholarly sources from academic journals or books
   - Engage with these sources critically—don't just summarize them
   - Show how scholarly perspectives enhance your own interpretation

4. PERSONAL REFLECTION (1 paragraph):
   - Conclude by reflecting on the contemporary relevance of these texts
   - How do these literary portrayals of the American Dream resonate today?
   - What can we learn from these authors about ambition, success, identity, and belonging in America?

FORMATTING GUIDELINES:
- 5-7 pages, double-spaced
- Times New Roman, 12-point font
- 1-inch margins on all sides
- MLA format for citations and Works Cited page
- Include your name, date, and class period in the header

EVALUATION CRITERIA:
Your essay will be evaluated based on:
- Strength and originality of thesis (20%)
- Quality of textual analysis and use of evidence (30%)
- Integration of scholarly sources (15%)
- Organization and coherence (15%)
- Writing quality, grammar, and mechanics (10%)
- Proper MLA citation format (10%)

DUE DATE: One week from today
SUBMISSION: Upload your essay as a PDF or Word document

ACADEMIC INTEGRITY:
This assignment must be your own original work. Plagiarism, including using AI-generated content without proper attribution, will result in a zero for the assignment and possible disciplinary action. If you're unsure about proper citation or need help developing your ideas, please come to office hours or visit the Writing Center.

Remember: The goal is not just to show what these texts say about the American Dream, but to develop your own sophisticated argument about what they reveal about American identity, aspiration, and the gap between promise and reality.""",
            "dueDate": now + timedelta(days=7),
            "maxScore": 100,
            "isPublished": True,
            "createdAt": now - timedelta(days=3),
            "rubricVisibleToStudents": False,
            "rubric": [
                {"id": "r1", "criterion": "Clear, arguable thesis engaging all required texts", "maxPoints": 20, "description": "Thesis is specific and sets an argument"},
                {"id": "r2", "criterion": "Close reading and textual evidence", "maxPoints": 25, "description": "Quotes integrated and analyzed"},
                {"id": "r3", "criterion": "Use of scholarly source", "maxPoints": 15, "description": "At least one scholarly source cited"},
                {"id": "r4", "criterion": "Organization and coherence", "maxPoints": 20, "description": "Logical flow, paragraphs with topic sentences"},
                {"id": "r5", "criterion": "MLA formatting and mechanics", "maxPoints": 20, "description": "MLA citations, grammar, length"}
            ],
            "totalPoints": 100,
        },
        {
            "_id": assignment2_id,
            "courseId": course1_id,
            "professorId": teacher1_clerk_id,
            "title": "Poetry Analysis: Modernist Voices",
            "description": "Close reading and interpretation of modernist American poetry.",
            "instructions": """AMERICAN LITERATURE - POETRY ANALYSIS

TOPIC: Close Reading of Modernist American Poetry

OVERVIEW:
This assignment focuses on developing your skills in close reading and poetic analysis. You will select ONE poem from the modernist period (1900-1945) and write a detailed 3-4 page analysis exploring its themes, formal elements, and cultural significance.

POEM SELECTION (Choose ONE):
- T.S. Eliot, "The Love Song of J. Alfred Prufrock"
- Ezra Pound, "In a Station of the Metro" or "The River-Merchant's Wife: A Letter"
- William Carlos Williams, "The Red Wheelbarrow" or "This Is Just to Say"
- Wallace Stevens, "The Emperor of Ice-Cream" or "Thirteen Ways of Looking at a Blackbird"
- Langston Hughes, "The Negro Speaks of Rivers" or "Harlem"
- H.D. (Hilda Doolittle), "Oread" or "Helen"

ANALYSIS COMPONENTS:

1. INTRODUCTION (½ page):
   - Identify the poem, poet, and publication date
   - Provide brief historical/biographical context
   - Present your interpretive thesis: What is this poem doing? What does it mean?

2. FORMAL ANALYSIS (1-1½ pages):
   Examine the poem's technical elements:
   - Form and structure: Is it free verse or does it follow a traditional form?
   - Line breaks and enjambment: How do they affect meaning and pacing?
   - Sound devices: alliteration, assonance, consonance, rhyme
   - Rhythm and meter: What patterns emerge?
   - Visual presentation: How does the poem look on the page?
   
   Don't just identify these elements—explain HOW they contribute to the poem's meaning and effect.

3. THEMATIC AND IMAGISTIC ANALYSIS (1-1½ pages):
   - What images dominate the poem? Track them throughout.
   - What themes emerge? (isolation, modernity, beauty, time, identity, etc.)
   - How do specific word choices create meaning?
   - What tensions or contradictions exist in the poem?
   - Consider: What is modernist about this poem? How does it break from or challenge earlier poetic traditions?

4. CONTEXTUAL INTERPRETATION (½-1 page):
   - How does this poem reflect its historical moment?
   - Consider: World War I, industrialization, urbanization, changing gender roles, the Harlem Renaissance (if applicable)
   - What was innovative or radical about this poem when it was published?

5. CONCLUSION (½ page):
   - Synthesize your analysis: What is the poem's overall achievement?
   - Why does this poem matter? What does it offer readers today?

REQUIRED ELEMENTS:
- Include the full text of the poem at the beginning of your paper (this doesn't count toward page length)
- Integrate specific quotations from the poem throughout your analysis
- Use at least ONE scholarly source for historical/critical context
- Cite sources in MLA format

FORMATTING:
- 3-4 pages (excluding the poem text), double-spaced
- Times New Roman, 12-point font
- Works Cited page

GRADING CRITERIA:
- Depth and sophistication of analysis (40%)
- Understanding of formal poetic elements (25%)
- Quality of textual evidence and close reading (20%)
- Organization and writing quality (10%)
- Proper citation and formatting (5%)

DUE DATE: Two weeks from today

NOTE: This is an exercise in YOUR interpretation. While you should consult one scholarly source for context, the analysis itself should reflect your own careful reading of the poem. Avoid relying on SparkNotes, LitCharts, or AI-generated summaries—they won't help you develop the close reading skills this assignment is designed to teach.""",
            "dueDate": now + timedelta(days=14),
            "maxScore": 100,
            "isPublished": True,
            "createdAt": now - timedelta(days=1),
            "rubricVisibleToStudents": False,
            "rubric": [
                {"id": "r1", "criterion": "Interpretive thesis about poem", "maxPoints": 20, "description": "Specific, arguable claim"},
                {"id": "r2", "criterion": "Formal analysis (form, line breaks, sound)", "maxPoints": 25, "description": "Explains how form creates meaning"},
                {"id": "r3", "criterion": "Imagery and theme analysis", "maxPoints": 20, "description": "Connects images to themes"},
                {"id": "r4", "criterion": "Contextual insight", "maxPoints": 15, "description": "Historical/author context used appropriately"},
                {"id": "r5", "criterion": "Organization and mechanics", "maxPoints": 20, "description": "Structure, grammar, citation"}
            ],
            "totalPoints": 100,
        },
        {
            "_id": assignment3_id,
            "courseId": course2_id,
            "professorId": teacher1_clerk_id,
            "title": "The Cold War: Causes, Conflicts, and Consequences",
            "description": "Research essay on a specific aspect of the Cold War era (1945-1991).",
            "instructions": """MODERN WORLD HISTORY - RESEARCH ESSAY

TOPIC: The Cold War Era (1945-1991)

OVERVIEW:
For this assignment, you will research and write a 6-8 page essay on a specific aspect, event, or consequence of the Cold War. This assignment requires you to use primary and secondary sources, construct a historical argument, and demonstrate your understanding of this pivotal period in modern world history.

RESEARCH FOCUS:
Select ONE of the following topics (or propose your own with instructor approval):

1. The Berlin Blockade and Airlift (1948-1949)
2. The Korean War and its global impact (1950-1953)
3. The Cuban Missile Crisis: Decision-making and diplomacy (1962)
4. The Vietnam War: Causes and consequences for Southeast Asia
5. The Space Race: Competition, propaganda, and technological advancement
6. The Prague Spring and Soviet control in Eastern Europe (1968)
7. Détente: The thaw in U.S.-Soviet relations (1969-1979)
8. The Soviet-Afghan War (1979-1989)
9. The fall of the Berlin Wall and German reunification (1989-1990)
10. The dissolution of the Soviet Union (1991)

ASSIGNMENT REQUIREMENTS:

1. RESEARCH FOUNDATION:
   - Use at least FIVE credible sources:
     * At least TWO primary sources (documents, speeches, photographs, government records, firsthand accounts)
     * At least THREE secondary sources (scholarly books, academic journal articles, documented historical analyses)
   - You may NOT use Wikipedia, general encyclopedias, or non-academic websites as sources
   - All sources must be properly cited in Chicago/Turabian format

2. HISTORICAL ARGUMENT (6-8 pages):
   
   A. INTRODUCTION (1 page):
   - Provide historical context for your topic
   - Explain why this topic is historically significant
   - State your thesis: What specific argument are you making about this event/topic?
   
   B. HISTORICAL ANALYSIS (4-6 pages):
   - Present evidence from your sources to support your thesis
   - Analyze causes: What factors led to this event?
   - Examine key players: Who were the important individuals/groups involved?
   - Assess consequences: What were the short-term and long-term impacts?
   - Consider multiple perspectives: How did different groups/nations view this event?
   - Make connections: How does this event relate to broader Cold War themes (containment, domino theory, proxy wars, nuclear deterrence, ideological competition)?
   
   C. HISTORICAL INTERPRETATION (1 page):
   - Engage with historiography: How have historians' interpretations of this event changed over time?
   - Address any controversies or debates among scholars
   - Explain which interpretation you find most convincing and why
   
   D. CONCLUSION (½ page):
   - Synthesize your argument
   - Reflect on the legacy: How does this Cold War event continue to influence our world today?

3. PRIMARY SOURCE ANALYSIS:
   Include a dedicated section (1 page) analyzing ONE key primary source in depth:
   - What is this source? (speech, treaty, photograph, etc.)
   - Who created it? When? For what purpose?
   - What can we learn from this source?
   - What are its limitations?
   - How does it help us understand the Cold War?

4. WORKS CITED/BIBLIOGRAPHY:
   - Chicago/Turabian format (footnotes or endnotes plus bibliography)
   - Properly cite all sources, including page numbers for direct quotes
   - Include stable URLs for online sources

FORMATTING REQUIREMENTS:
- 6-8 pages, double-spaced (title page and bibliography do not count toward page length)
- Times New Roman, 12-point font
- 1-inch margins
- Title page with your name, date, class period, and essay title
- Page numbers
- Chicago/Turabian citation style throughout

EVALUATION CRITERIA:
Your essay will be evaluated on:
- Strength and clarity of historical argument (25%)
- Quality and diversity of research sources (20%)
- Depth of historical analysis (20%)
- Effective use of evidence (15%)
- Understanding of Cold War context and significance (10%)
- Organization and writing quality (5%)
- Proper Chicago/Turabian citation (5%)

RESEARCH TIPS:
- Start with your textbook for general context
- Use library databases (JSTOR, Academic Search Complete) for scholarly articles
- Check the National Archives, Presidential Libraries, and university digital collections for primary sources
- Consult your librarian for research assistance
- Keep careful notes and track all source information as you research

ACADEMIC INTEGRITY:
This must be your own original work based on your own research. Plagiarism includes:
- Copying from sources without quotation marks and citations
- Paraphrasing without attribution
- Using AI tools to generate any part of your essay
- Submitting work written by someone else

Violations will result in a zero and referral for disciplinary action.

DUE DATE: Three weeks from today
SUBMISSION: Upload final essay as PDF

MILESTONE DEADLINES:
- Topic selection: End of Week 1
- Annotated bibliography (5 sources): End of Week 2
- Rough draft (optional, for feedback): End of Week 2.5
- Final essay: End of Week 3

Remember: This assignment is about developing your skills as a historian—asking good questions, finding evidence, constructing arguments, and understanding how the past shapes the present. Take time to think deeply about your topic and what it reveals about this crucial period in world history.""",
            "dueDate": now + timedelta(days=21),
            "maxScore": 100,
            "isPublished": True,
            "createdAt": now - timedelta(days=5),
            "rubricVisibleToStudents": False,
            "rubric": [
                {"id": "r1", "criterion": "Focused historical thesis", "maxPoints": 20, "description": "Defensible claim on chosen Cold War topic"},
                {"id": "r2", "criterion": "Use of primary sources", "maxPoints": 20, "description": "At least two primary sources analyzed"},
                {"id": "r3", "criterion": "Use of secondary scholarship", "maxPoints": 15, "description": "Three scholarly sources contextualized"},
                {"id": "r4", "criterion": "Cause-effect and consequences analysis", "maxPoints": 20, "description": "Explains causes, actors, impacts"},
                {"id": "r5", "criterion": "Organization, citations, mechanics", "maxPoints": 25, "description": "Structure, Chicago style, grammar"}
            ],
            "totalPoints": 100,
        },
        {
            "_id": assignment4_id,
            "courseId": course2_id,
            "professorId": teacher1_clerk_id,
            "title": "Document-Based Question: Decolonization Movements",
            "description": "DBQ essay analyzing primary sources about decolonization in Africa and Asia.",
            "instructions": """MODERN WORLD HISTORY - DOCUMENT BASED QUESTION (DBQ)

TOPIC: Decolonization Movements in Africa and Asia (1945-1975)

OVERVIEW:
This Document-Based Question (DBQ) asks you to analyze primary source documents and construct a historical argument about the causes, methods, and outcomes of decolonization movements in the post-World War II era. You will receive a packet of 7-10 primary source documents and must use at least 6 of them in your essay.

HISTORICAL BACKGROUND:
Following World War II, dozens of former European colonies in Africa and Asia gained independence through various means—negotiation, armed struggle, mass movements, and political pressure. This transformation reshaped the global political landscape and created new nations that faced enormous challenges. Understanding decolonization is essential to understanding modern world history, post-colonial theory, and contemporary global relations.

THE QUESTION:
"Analyze the factors that led to decolonization in Africa and Asia between 1945 and 1975. To what extent were independence movements successful in achieving their goals of political sovereignty, economic independence, and social transformation?"

INSTRUCTIONS:

1. READ AND ANALYZE THE DOCUMENTS:
   You will be provided with 7-10 primary sources that may include:
   - Political speeches and manifestos
   - Government documents and legislation
   - Photographs and political cartoons
   - Personal testimonies and memoirs
   - International agreements and UN resolutions
   - Statistical data
   - Newspaper articles from the period

2. DEVELOP YOUR THESIS:
   Based on the documents and your knowledge of the period, develop a clear, sophisticated thesis that:
   - Answers the question directly
   - Takes a clear position
   - Can be supported with evidence from the documents
   - Shows analysis, not just description

3. WRITE YOUR ESSAY (4-6 pages):

   A. INTRODUCTION (¾ page):
   - Provide historical context for decolonization
   - Clearly state your thesis
   
   B. BODY PARAGRAPHS (3-4 pages):
   - Organize your essay thematically or by region (not document-by-document)
   - Use at least 6 documents as evidence
   - For each document, consider:
     * Point of view: Who created this? What is their perspective?
     * Purpose: Why was this created? What was the intended audience?
     * Historical context: When and where was this created?
     * Significance: What does this reveal about decolonization?
   - Incorporate outside historical knowledge to support your argument
   - Make connections between documents
   - Address counterarguments or complexity
   
   C. CONCLUSION (½ page):
   - Synthesize your argument
   - Address broader significance: What does decolonization teach us about power, nationalism, self-determination, and global change?

REQUIRED SKILLS:
You must demonstrate:
- SOURCING: Analyze the author, audience, purpose, and historical context of documents
- CONTEXTUALIZATION: Situate the argument within broader historical context
- EVIDENCE: Support your thesis with specific evidence from at least 6 documents
- ANALYSIS: Explain how the evidence supports your argument (don't just summarize)
- SYNTHESIS: Make connections between documents and to broader themes

DBQ WRITING TIPS:
- Don't treat each document as a separate paragraph
- Don't just quote documents—analyze them
- Don't ignore documents that complicate your argument—address them!
- Do group documents by theme or type
- Do explain WHY documents are relevant to your argument
- Do cite documents properly (Document 1, Document 2, etc.)

OUTSIDE KNOWLEDGE:
While the documents are central to your essay, you should also incorporate relevant historical information not found in the documents, such as:
- Specific independence movements (Indian independence, Algerian War, Ghanaian independence, etc.)
- Key figures (Gandhi, Nkrumah, Ho Chi Minh, Sukarno, Nasser, etc.)
- Important events (Bandung Conference, wars of independence, etc.)
- Relevant historical context (WWII's impact, Cold War influence, etc.)

FORMATTING:
- 4-6 pages, double-spaced
- Times New Roman, 12-point font
- No outside research required (use only the provided documents and your class knowledge)
- Cite documents parenthetically: (Doc. 1), (Doc. 3), etc.

EVALUATION RUBRIC:
- Thesis (0-1 point): Clear, historically defensible thesis
- Contextualization (0-1 point): Broader historical context explained
- Evidence (0-3 points): Use of at least 6 documents to support argument
- Analysis and Reasoning (0-2 points): Explanation of how evidence supports thesis
- Complexity (0-1 point): Sophisticated argument that considers multiple perspectives

Total: 8 points (converted to 100-point scale)

PRACTICE PREPARATION:
Before the assessment:
- Review your notes on decolonization
- Practice analyzing primary sources for point of view, purpose, and audience
- Review DBQ writing strategies
- Practice organizing arguments thematically

TIME LIMIT: 100 minutes in class
- Reading period: 15 minutes
- Writing period: 85 minutes

This DBQ will be completed IN CLASS. You may bring one 3x5 notecard with key dates/names (no full sentences).

TEST DATE: Two weeks from today

STUDY RECOMMENDATIONS:
- Review textbook chapters on decolonization (Chapters 23-24)
- Review your class notes on African and Asian independence movements
- Practice with the sample DBQ provided on our course website
- Attend the review session next week

Remember: The goal is not just to summarize the documents, but to use them as evidence to construct a historical argument. Think like a historian—ask questions, analyze sources critically, and build interpretations based on evidence.""",
            "dueDate": now + timedelta(days=14),
            "maxScore": 100,
            "isPublished": True,
            "createdAt": now - timedelta(days=2),
            "rubricVisibleToStudents": False,
            "rubric": [
                {"id": "r1", "criterion": "Clear thesis addressing decolonization factors", "maxPoints": 20, "description": "Takes a position on causes/success"},
                {"id": "r2", "criterion": "Document sourcing and analysis", "maxPoints": 25, "description": "Uses 6+ docs with POV/purpose/context"},
                {"id": "r3", "criterion": "Outside knowledge integration", "maxPoints": 20, "description": "Connects events/figures beyond docs"},
                {"id": "r4", "criterion": "Argument organization and complexity", "maxPoints": 15, "description": "Logical grouping, considers counterpoints"},
                {"id": "r5", "criterion": "Writing quality and mechanics", "maxPoints": 20, "description": "Clarity, grammar, format"}
            ],
            "totalPoints": 100,
        },
    ]
    db.assignments.insert_many(assignments)

    # Create sample submissions (only for assignment 1)
    print("Creating sample submissions...")
    submissions = [
        {
            "_id": ObjectId(),
            "assignmentId": assignment1_id,
            "studentId": student1_clerk_id,
            "teacherId": teacher1_clerk_id,
            "submittedFileUrl": None,
            "submittedText": "The American Dream is a central theme throughout F. Scott Fitzgerald's The Great Gatsby, where it is portrayed as both an inspiring ideal and a destructive illusion. Through the character of Jay Gatsby, Fitzgerald demonstrates how the pursuit of wealth and status in pursuit of the Dream can lead to moral compromise and ultimate tragedy. This essay will analyze how Gatsby's fixation on recapturing the past through material success reveals the corruption and emptiness at the heart of the American Dream in the 1920s.",
            "submittedAt": now - timedelta(hours=12),
            "suspicionScore": 0,
            "indicatorsFound": [],
            "needsInterview": False,
            "interviewCompleted": False,
            "status": "submitted",
            "score": None,
            "feedback": None,
            "createdAt": now - timedelta(hours=12),
            "updatedAt": now - timedelta(hours=12),
        },
        {
            "_id": ObjectId(),
            "assignmentId": assignment1_id,
            "studentId": student2_clerk_id,
            "teacherId": teacher1_clerk_id,
            "submittedFileUrl": None,
            "submittedText": "In examining the multifaceted representation of the American Dream across twentieth-century American literature, one observes a pronounced evolution from aspirational narrative to critical deconstruction. F. Scott Fitzgerald's magnum opus The Great Gatsby (1925) epitomizes the Jazz Age's simultaneous celebration and interrogation of material success as the quintessential manifestation of American identity. Subsequently, Arthur Miller's dramatic masterwork Death of a Salesman (1949) extends this critique by foregrounding the psychological devastation wrought upon those who internalize capitalist mythology without achieving its promised rewards. The works demonstrate how the American Dream functions as both cultural touchstone and insidious ideology.",
            "submittedAt": now - timedelta(hours=8),
            "suspicionScore": 3,
            "indicatorsFound": [
                {
                    "type": "advanced_vocabulary",
                    "evidence": "multifaceted representation, pronounced evolution, aspirational narrative",
                    "location": "opening sentence"
                },
                {
                    "type": "sophisticated_phrasing",
                    "evidence": "foregrounding the psychological devastation wrought upon",
                    "location": "paragraph 1"
                },
                {
                    "type": "unusual_terminology",
                    "evidence": "insidious ideology, capitalist mythology",
                    "location": "conclusion"
                }
            ],
            "needsInterview": True,
            "interviewCompleted": False,
            "status": "flagged",
            "score": None,
            "feedback": None,
            "createdAt": now - timedelta(hours=8),
            "updatedAt": now - timedelta(hours=8),
        },
        {
            "_id": ObjectId(),
            "assignmentId": assignment1_id,
            "studentId": student3_clerk_id,
            "teacherId": teacher1_clerk_id,
            "submittedFileUrl": None,
            "submittedText": "The Great Gatsby shows that the American Dream doesn't really work out for everyone. Gatsby tries really hard to get rich and impress Daisy but it doesn't work. He throws big parties and buys a huge house but she still picks Tom. In the end Gatsby dies and nobody even comes to his funeral which shows that money and stuff doesn't make you happy or get you real friends. The book is saying that the American Dream is fake.",
            "submittedAt": now - timedelta(hours=4),
            "suspicionScore": 0,
            "indicatorsFound": [],
            "needsInterview": False,
            "interviewCompleted": False,
            "status": "submitted",
            "score": 72,
            "feedback": "You have the basic idea, but your analysis needs more depth and textual evidence. Use specific quotes from the text to support your points.",
            "createdAt": now - timedelta(hours=4),
            "updatedAt": now - timedelta(hours=1),
        },
    ]
    db.submissions.insert_many(submissions)
    
    print(f"\n✓ Seed complete!")
    print(f"  - 2 high school courses created (American Literature, Modern World History)")
    print(f"  - 4 assignments created (2 per course)")
    print(f"  - 3 students enrolled in both courses")
    print(f"  - 3 submissions for American Literature essay")
    print(f"\nData summary:")
    print(f"  - American Literature:")
    print(f"    * Assignment 1 (American Dream essay): 3 submissions")
    print(f"    * Assignment 2 (Poetry analysis): No submissions yet")
    print(f"  - Modern World History:")
    print(f"    * Assignment 1 (Cold War research): No submissions yet")
    print(f"    * Assignment 2 (Decolonization DBQ): No submissions yet")
    print(f"\n  - Student 2's essay is FLAGGED for review (advanced language)")
    print(f"  - Student 3's essay is graded (72/100)")
    print(f"  - Student 1's essay is pending review")
    print(f"\nYou can now sign in with your Clerk accounts:")
    print(f"  - Teacher: user_3860EL7WeRMr3h5Z0aUBhD9gQkb")
    print(f"  - Students: user_3860ZnBXCboxu4fQV9a2KgOAJI6, user_3860VYcoSXUS6WpLjBkm2bUy5EU, user_3860IgwpS4QlnYfPRDh38uqQA0b")
    
    client.close()

if __name__ == "__main__":
    seed_database()
