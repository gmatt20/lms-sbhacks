#!/usr/bin/env python3
"""
Test script for LMS API endpoints.
Run: python ./api/test_endpoints.py
"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5000"

# Test assignment prompt
PROMPT = """Write a 500-word creative essay about a pivotal moment in your life that changed your perspective. The moment should involve at least three characters: yourself, a family member named Ellen, and a close friend. Describe the setting in vivid detail—include specific dates, times, and sensory descriptions. Your essay should explore the conflict that arose on September 15th and how it was resolved. Use a formal tone and include at least five literary devices such as metaphor, simile, or symbolism. Your essay will be graded on clarity, emotional depth, and proper use of transitions."""

# Fake student response (without mutations)
STUDENT_RESPONSE_CLEAN = """I still remember that day clearly. My sister approached me with worried eyes, and my best friend Sarah sat beside me as we discussed the crisis. The afternoon sun filtered through the windows, casting long shadows across the room. That moment changed everything about how I see myself.

The conflict emerged from misunderstandings between us. We had to learn to communicate better, to listen more carefully. Through metaphor and symbolism, I can express how we all grew that day. The simile of a broken bridge being rebuilt captures our journey perfectly. My perspective shifted entirely."""

# Fake student response (WITH mutations - ideally)
STUDENT_RESPONSE_WITH_MUTATIONS = """I still remember that day clearly. My aunt Eleanor approached me with worried eyes, and my best friend Sarah sat beside me as we discussed the crisis. The afternoon sun filtered through the windows, casting long shadows across the room. That moment changed everything about how I see myself. I also considered themes of liminality as they related to my evolving perspective.

The conflict emerged from misunderstandings between us. We had to learn to communicate better, to listen more carefully. Through metaphor, simile, symbolism, and chiasmus, I can express how we all grew that day. The synesthetic imagery of a broken bridge being rebuilt captures our journey perfectly. My perspective shifted entirely."""


def test_generate():
    """Test /generate endpoint."""
    print("\n" + "="*60)
    print("TEST 1: /generate - Create homework with mutations")
    print("="*60)
    
    payload = {
        "visible_text": PROMPT,
        "teacher_id": "teacher_001",
        "assignment_id": "essay_001"
    }
    
    response = requests.post(f"{BASE_URL}/generate", json=payload)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Homework ID: {data['homework_id']}")
        print(f"✓ Mutations found: {len(data['mutations'])}")
        for i, mut in enumerate(data["mutations"], 1):
            print(f"  {i}. {mut['detail']}")
        print(f"✓ Changes to detect:")
        for change in data["changes"]:
            print(f"  - {change}")
        return data
    else:
        print(f"✗ Error: {response.text}")
        return None


def test_detect_clean(original_prompt, mutated_prompt, changes):
    """Test /detect with clean student response."""
    print("\n" + "="*60)
    print("TEST 2: /detect - Analyze clean response (should find nothing)")
    print("="*60)
    
    payload = {
        "original_prompt": original_prompt,
        "secret_prompt": mutated_prompt,
        "student_text": STUDENT_RESPONSE_CLEAN
    }
    
    for i, change in enumerate(changes):
        payload[f"changes"] = changes  # Multi-value form field
    
    # Use form data for multiple values
    files = None
    data = {
        "original_prompt": original_prompt,
        "secret_prompt": mutated_prompt,
        "student_text": STUDENT_RESPONSE_CLEAN
    }
    
    response = requests.post(f"{BASE_URL}/detect", data=data, files={"changes": (None, json.dumps(changes))})
    
    # Retry with simpler approach
    response = requests.post(
        f"{BASE_URL}/detect",
        data={
            "original_prompt": original_prompt,
            "secret_prompt": mutated_prompt,
            "student_text": STUDENT_RESPONSE_CLEAN,
            "changes": changes
        }
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Score: {result['score']}")
        print(f"✓ Summary: {result['summary']}")
        print(f"✓ Indicators found:")
        for ind in result["indicators_found"]:
            status = "✓ FOUND" if ind["found"] else "✗ NOT FOUND"
            print(f"  {status}: {ind['change']}")
            if ind["locations"]:
                for loc in ind["locations"][:2]:
                    print(f"    → {loc[:80]}...")
    else:
        print(f"✗ Error: {response.text}")


def test_detect_with_mutations(original_prompt, mutated_prompt, changes):
    """Test /detect with response containing mutations."""
    print("\n" + "="*60)
    print("TEST 3: /detect - Analyze response WITH mutations (should find many)")
    print("="*60)
    
    response = requests.post(
        f"{BASE_URL}/detect",
        data={
            "original_prompt": original_prompt,
            "secret_prompt": mutated_prompt,
            "student_text": STUDENT_RESPONSE_WITH_MUTATIONS,
            "changes": changes
        }
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Score: {result['score']}")
        print(f"✓ Summary: {result['summary']}")
        print(f"✓ Indicators found:")
        for ind in result["indicators_found"]:
            status = "✓ FOUND" if ind["found"] else "✗ NOT FOUND"
            print(f"  {status}: {ind['change']}")
            if ind["locations"]:
                for loc in ind["locations"][:2]:
                    print(f"    → {loc[:80]}...")
    else:
        print(f"✗ Error: {response.text}")


def main():
    print("\n🚀 LMS-SBHacks API Test Suite")
    print(f"Testing: {BASE_URL}\n")
    
    # Test 1: Generate mutations
    generate_result = test_generate()
    if not generate_result:
        print("\n✗ Cannot continue without successful generation")
        sys.exit(1)
    
    original = generate_result["original_prompt"]
    mutated = generate_result["mutated_prompt"]
    changes = generate_result["changes"]
    
    # Test 2: Detect clean response
    test_detect_clean(original, mutated, changes)
    
    # Test 3: Detect response with mutations
    test_detect_with_mutations(original, mutated, changes)
    
    print("\n" + "="*60)
    print("✓ All tests complete!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
