export default async function addTranscript(transcript) {
  try {
    const response = await fetch("http://localhost:3000/api/interviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcript,
      }),
    });

    if (!response.ok) {
      if (response.status === 400 || response.status === 422) {
        console.error("Bad request: Check input data.", response.statusText);
      } else if (response.status >= 500) {
        console.error("Server-side error occurred.", response.statusText);
      }
      throw new Error(
        `Unexpected error adding transcript: ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("Transcript added successfully:", data);
    return data;
  } catch (error) {
    console.error("Error while adding transcript:", error);
    throw error;
  }
}
