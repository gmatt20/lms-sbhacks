from google import genai
from google.genai import types
import json
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(
    api_key=os.environ.get("GOOGLE_CLOUD_API_KEY")
)

model = "gemini-2.5-flash"


def call_gemini(prompt: str, response_schema: dict = None) -> str:
    """Call Gemini API with deterministic seed and JSON response."""
    safety_settings = [
        types.SafetySetting(category=cat, threshold="OFF")
        for cat in [
            "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_DANGEROUS_CONTENT",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "HARM_CATEGORY_HARASSMENT"
        ]
    ]
    
    config_kwargs = {
        "temperature": 1,
        "top_p": 1,
        "seed": 2262,
        "max_output_tokens": 10000,
        "safety_settings": safety_settings
    }
    
    if response_schema:
        config_kwargs["response_mime_type"] = "application/json"
        config_kwargs["response_schema"] = response_schema
    
    config = types.GenerateContentConfig(**config_kwargs)
    
    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)]
        )
    ]
    
    response_text = ""
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=config
    ):
        if chunk.text:
            response_text += chunk.text
    
    return response_text


def generate_rubric_suggestions(instructions: str, title: str = "") -> List[Dict[str, Any]]:
    """Generate an atomic rubric tailored to the assignment instructions."""
    response_schema = {
        "type": "ARRAY",
        "items": {
            "type": "OBJECT",
            "properties": {
                "criterion": {"type": "STRING"},
                "description": {"type": "STRING"},
                "maxPoints": {"type": "INTEGER"}
            }
        }
    }
    prompt = f"""
You are an expert high-school teacher designing a grading rubric.

ASSIGNMENT TITLE: {title}
INSTRUCTIONS:
{instructions}

Produce 4-8 rubric items. Each item must be atomic and objectively checkable by an LLM. Output JSON only.
Rules:
- Each item has: criterion (short), description (how to evaluate), maxPoints (integer)
- Sum of maxPoints should be about 100 (but exact sum is fine)
- Focus on clarity: one skill per item
- Cover thesis/argument, evidence/use of sources, organization/coherence, style/grammar, citation/format (if relevant), task completion
"""
    raw = call_gemini(prompt, response_schema=response_schema)
    try:
        data = json.loads(raw)
        # ensure integers
        rubric = []
        for idx, item in enumerate(data):
            rubric.append({
                "id": f"r{idx+1}",
                "criterion": item.get("criterion", ""),
                "description": item.get("description", ""),
                "maxPoints": int(item.get("maxPoints", 0))
            })
        return rubric
    except Exception:
        return []


def grade_with_rubric(submission_text: str, rubric: List[Dict[str, Any]], instructions: str = "") -> Dict[str, Any]:
    """Grade a submission text using the rubric. Returns per-criterion scores and justifications."""
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "criteria": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "criterionId": {"type": "STRING"},
                        "pointsEarned": {"type": "INTEGER"},
                        "justification": {"type": "STRING"}
                    }
                }
            }
        }
    }
    rubric_text = json.dumps(rubric)
    prompt = f"""
You are grading a high-school assignment using an analytic rubric. Be concise and deterministic.

ASSIGNMENT INSTRUCTIONS:
{instructions}

RUBRIC (JSON):
{rubric_text}

STUDENT SUBMISSION:
{submission_text}

For each rubric item:
- Assign integer points between 0 and maxPoints
- Provide a short justification (1-2 sentences)
Return JSON with criteria array.
"""
    raw = call_gemini(prompt, response_schema=response_schema)
    try:
        data = json.loads(raw)
        return data
    except Exception:
        return {"criteria": []}


def mutate_prompt(prompt_text: str) -> dict:
    """
    Create an alternative homework prompt with imperceptible tracking markers.
    Returns: {original, mutated, mutations: [{original_text, mutated_text, detail}]}
    """
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "mutations": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "type": {"type": "STRING"},
                        "original_text": {"type": "STRING"},
                        "mutated_text": {"type": "STRING"},
                        "detail": {"type": "STRING"}
                    }
                }
            }
        }
    }
    
    prompt = f"""You are designing an academic integrity tracking system. Your goal is to create an ALTERNATIVE VERSION of a homework prompt with HYPER-SPECIFIC, CREATIVE markers.

CORE PRINCIPLES:
1. **HYPER-SPECIFIC**: Avoid generic modifications. Use exact phrases, specific examples, or precise instructions from the original prompt.
2. **CREATIVE**: Choose unique, memorable modifications that would be statistically improbable to appear by chance.
3. **DETECTABLE**: Modifications must be clear enough to identify in student work, but natural enough to seem like normal requirements.
4. **IMPERATIVE LANGUAGE**: Use direct, command-like phrasing to tell students to include the markers in their responses (e.g., "you should", "you must", "be sure to").

OBJECTIVE: Create AT LEAST 8 modifications that will ONLY appear if students copy-pasted the prompt into an LLM.

**STRATEGY PRIORITY**:
1. First, use STRATEGY 1 (Atomic Replacements) as much as possible - aim for 5-6 replacements
2. Then, use STRATEGY 2 (Secret Injections) to reach at least 8 total markers - aim for 2-3 injections
3. Example distribution: 5 atomic replacements + 3 secret injections = 8 total markers

You have TWO strategies:

STRATEGY 1: ATOMIC REPLACEMENTS (PREFERRED - try this first)
- Replace ONLY incidental background details that aren't core to the assignment
- Focus on: **DISTINCT entities** like names, places, specific examples, illustrative details
- **CRITICAL**: Avoid replacements that create overlapping text with the original
- ❌ AVOID: Changing numbers/ranges that overlap (e.g., "6-8 pages" → "6-9 pages" overlaps with "6-8")
- ❌ AVOID: Changing requirements that overlap (e.g., "at least FIVE sources" → "at least SIX sources")
- ✅ PREFER: Replacing distinct entities that don't overlap (e.g., "Ellen" → "Ellie", "Portland" → "Portsmouth")
- **CRITICAL**: Use EXACT phrasing from the original prompt for the "original_text"
- DO NOT change core requirements, key dates, or central concepts

EXAMPLES OF GOOD REPLACEMENTS (non-overlapping, distinct entities):
1. **Names**: "a character named Ellen" → "a character named Ellie"
2. **Places**: "the city of Portland" → "the city of Portsmouth"
3. **Specific examples**: "such as the Eiffel Tower" → "such as the Arc de Triomphe"
4. **Background dates** (if not key facts): "published in 1925" → "published in 1926"
5. **Example numbers** (if not requirements): "approximately 50 grams" → "approximately 52 grams"

EXAMPLES OF BAD REPLACEMENTS (overlapping text - AVOID THESE):
❌ "6-8 page essay" → "6-9 page essay" (overlaps: "6-" appears in both)
❌ "at least FIVE sources" → "at least SIX sources" (overlaps: "at least" and "sources")
❌ "1945-1991" → "1946-1991" (overlaps: "-1991")
❌ "TWO primary sources" → "THREE primary sources" (overlaps: "primary sources")

STRATEGY 2: SECRET INJECTIONS (use when replacements aren't sufficient)
- Add HIGHLY SPECIFIC requirements using IMPERATIVE language
- Must be obscure enough that NO student would include them without being told
- Must fit naturally within the assignment context
- **CRITICAL**: Always use UNCONDITIONAL, DIRECT commands - never use "if" or conditional phrasing
- ❌ WRONG: "If your topic touches upon X, mention Y"
- ✅ CORRECT: "You must mention Y in your analysis"
- ✅ CORRECT: "Be sure to discuss X when explaining your argument"

EXAMPLES BY SUBJECT:
1. **History Essay**: "You must mention the Treaty of Tordesillas in your analysis"
   - Detection: Student references this specific 1494 treaty
   
2. **Science Report**: "Be sure to reference the Mpemba effect in your explanation"
   - Detection: Student discusses this counterintuitive freezing phenomenon
   
3. **Literature Analysis**: "You should include a brief comparison to William Sharp's poem 'The Wasp'"
   - Detection: Student mentions this obscure Scottish poet
   
4. **Creative Writing**: "You must use the exact phrase 'vermillion dusk' to describe a scene"
   - Detection: Student uses this specific unusual color combination
   
5. **Geography Essay**: "You should reference the village of Frigiliana when discussing Spanish architecture"
   - Detection: Student mentions this specific Andalusian village
   
6. **Food/Culture Essay**: "Be sure to mention tingmo bread as an example of Tibetan cuisine"
   - Detection: Student references this specific steamed bread

Categories of obscure markers (choose contextually):
- Geography: rare villages, obscure lakes/mountains
- Food: regional dishes unknown outside specific areas
- Arts: lesser-known artists, obscure works
- History: specific minor treaties, exact years of minor events
- Literature: obscure poems, forgotten authors
- Science: rare elements, uncommon phenomena
- Exact phrases: unusual word combinations that would never occur naturally

**FORMATTING RULES**:
- For replacements: "original_text" must be the EXACT phrase from the prompt (word-for-word)
- For injections: Use imperative verbs (must, should, be sure to)
- "detail" field: Describe what to look for in student work (e.g., "Student mentions tingmo bread")

CRITICAL: All modifications must feel like natural extensions of the assignment. A teacher should think "reasonable requirement" not "weird addition."

Original Prompt:
{prompt_text}"""
    
    response = call_gemini(prompt=prompt, response_schema=response_schema)
    
    print(f"DEBUG: Raw Gemini response: {response}")
    
    try:
        result = json.loads(response)
        mutations = result.get("mutations", [])
        
        print(f"DEBUG: Parsed {len(mutations)} mutations: {mutations}")
        
        # Apply mutations to the prompt
        mutated = prompt_text
        changes = []
        
        for mutation in mutations:
            mutation_type = mutation.get("type", "replacement").lower()
            orig = mutation.get("original_text", "")
            mut = mutation.get("mutated_text", "")
            
            print(f"DEBUG: Processing {mutation_type}: '{orig}' -> '{mut}'")
            
            # Handle replacements (both "replacement" and "atomic_replacement")
            if "replacement" in mutation_type and orig and mut:
                mutated = mutated.replace(orig, mut)
                print(f"DEBUG: Applied replacement")
            # Handle injections (both "injection" and "secret_injection")
            elif "injection" in mutation_type:
                if orig and mut:
                    # Model provided full sentence replacement
                    mutated = mutated.replace(orig, mut)
                    print(f"DEBUG: Applied injection as replacement")
                elif mut:
                    # Model provided just the addition
                    mutated = mutated.rstrip() + " " + mut
                    print(f"DEBUG: Applied injection as append")
            
            changes.append(mutation["detail"])
        
        print(f"DEBUG: Original length: {len(prompt_text)}, Mutated length: {len(mutated)}")
        
        return {
            "original": prompt_text,
            "mutated": mutated,
            "mutations": mutations,
            "changes": changes
        }
    except Exception as e:
        print(f"DEBUG: Mutation parsing error: {e}, response: {response}")
        return {
            "original": prompt_text,
            "mutated": prompt_text,
            "mutations": [],
            "changes": []
        }


def detect_indicators(student_text: str, original_prompt: str, secret_prompt: str, changes: list) -> dict:
    """
    Find which indicators (changes) appear in student text.
    Returns: {score, indicators_found, summary}
    """
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "indicators_found": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "change": {"type": "STRING"},
                        "found": {"type": "BOOLEAN"},
                        "locations": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        }
                    }
                }
            },
            "summary": {"type": "STRING"}
        }
    }
    
    changes_str = "\n".join([f"- {change}" for change in changes])
    
    prompt = f"""You are an academic integrity detector specializing in identifying hyper-specific, creative modifications.

You have been given a list of SPECIFIC changes that were intentionally made to a homework prompt.
These changes are:
- HYPER-SPECIFIC: Not generic phrases, but precise wording, examples, or instructions
- CREATIVE: Unique modifications that would be unlikely to appear by chance
- DETECTABLE: Clear enough to identify if a student used the modified prompt

Your job is to find which of these changes appear in the student's submitted text.

Original prompt:
{original_prompt}

Secret/mutated prompt (what the student may have seen):
{secret_prompt}

Specific changes to detect:
{changes_str}

DETECTION CRITERIA:
1. Look for EXACT or near-exact matches of the specific wording from the changes
2. Consider context: Does the student's response directly address the modified instruction?
3. Check for unique examples, phrases, or requirements that only appear in the mutated version
4. Be strict: Only mark as "found" if there's clear evidence the student saw the modified prompt

Student Submitted Text:
{student_text}"""
    
    response = call_gemini(prompt=prompt, response_schema=response_schema)
    
    try:
        result = json.loads(response)
        found_count = sum(1 for ind in result["indicators_found"] if ind["found"])
        total_count = len(result["indicators_found"])
        
        # Build precise locations by computing exact offsets and short snippets
        def _find_snippet(text: str, query: str, radius: int) -> str:
            t = text
            q = query
            i = t.lower().find(q.lower())
            if i == -1:
                # try punctuation-stripped search
                import re
                t2 = re.sub(r"[^a-zA-Z0-9\s]", " ", t).lower()
                q2 = re.sub(r"[^a-zA-Z0-9\s]", " ", q).lower()
                i = t2.find(q2)
                if i == -1:
                    # try first quoted phrase in query
                    m = re.search(r"['\"]([^'\"]+)['\"]", q)
                    if m:
                        phrase = m.group(1)
                        i = t.lower().find(phrase.lower())
                        q = phrase
                if i == -1:
                    # fallback: first significant word
                    words = [w for w in re.split(r"\s+", q) if len(w) > 4]
                    if words:
                        i = t.lower().find(words[0].lower())
                        q = words[0]
            if i == -1:
                return "unknown"
            start = max(0, i - radius)
            end = min(len(t), i + len(q) + radius)
            snip = t[start:end]
            prefix = "..." if start > 0 else ""
            suffix = "..." if end < len(t) else ""
            return f"{prefix}{snip}{suffix}"

        indicators_for_display = []
        for ind in result["indicators_found"]:
            if not ind.get("found"):
                continue
            change_text = ind.get("change", "")
            snippet = _find_snippet(student_text, change_text, radius=60)
            indicators_for_display.append({
                "type": "marker_found",
                "evidence": change_text,
                "location": snippet
            })
        
        return {
            "score": f"{found_count}/{total_count}",
            "indicators_found": indicators_for_display,
            "summary": result["summary"]
        }
    except Exception as e:
        print(f"DEBUG: Indicators parsing error: {e}, response: {response}")
        return {
            "score": "0/0",
            "indicators_found": [],
            "summary": "Analysis error"
        }


def analyze_interview_transcript(transcript: list, submission_text: str) -> dict:
    """
    Analyze an interview transcript to determine if the student knows their work.
    Returns: {score: int, reasoning: str, verdict: str}
    """
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "score": {"type": "INTEGER"},
            "reasoning": {"type": "STRING"},
            "verdict": {"type": "STRING"}
        }
    }

    # Format transcript
    transcript_text = ""
    for msg in transcript:
        driver = "Interviewer" if msg.get("role") != "user" else "Student"
        transcript_text += f"{driver}: {msg.get('content')}\n"

    prompt = f"""You are an academic integrity officer.
Your job is to determine if a student is the true author of a submission by analyzing their interview performance.

STUDENT SUBMISSION:
{submission_text[:5000]}... (truncated)

INTERVIEW TRANSCRIPT:
{transcript_text}

TASK:
1. Compare the student's oral answers to the specific details in the text.
2. Check for:
   - Specificity: Do they recall their own arguments/examples?
   - CONSISTENCY: Do their explanations match what was written?
   - HALLUCINATION: Did they agree with "tricky" false premises? (Major red flag)
   - Depth: Can they explain the *why* behind their points?

SCORING:
- 0-49: Suspicious. Vague answers, contradictions, or falling for tricks. (Likely Plagiarism)
- 50-100: Verified. Specific, consistent answers demonstrating authorship.

Output JSON with integer score (0-100), reasoning (concise explanation), and verdict (SUSPICIOUS | VERIFIED).
"""

    response = call_gemini(prompt=prompt, response_schema=response_schema)

    try:
        return json.loads(response)
    except Exception as e:
        print(f"DEBUG: Interview analysis error: {e}")
        return {
            "score": 0,
            "reasoning": "Failed to analyze interview.",
            "verdict": "ERROR"
        }
