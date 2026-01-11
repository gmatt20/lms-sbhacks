"use client";

import { Button } from "../ui/button";

export default function Pdf() {
  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const fileInput = (e.target as HTMLFormElement).elements.namedItem(
            "pdf",
          ) as HTMLInputElement;
          if (!fileInput.files?.[0]) return alert("Please select a PDF file.");
          const file = fileInput.files[0];
          if (file.type !== "application/pdf")
            return alert("Only PDF files are allowed.");
          // TODO: Upload logic here (e.g., to your API or a service)
          alert(`Selected file: ${file.name}`);
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="text-sm font-medium">Upload PDF</span>
          <input
            type="file"
            name="pdf"
            accept="application/pdf"
            className="mt-2 block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
            required
          />
        </label>
        <Button type="submit">Upload</Button>
      </form>
    </div>
  );
}
