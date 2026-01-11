import { redirect } from 'next/navigation';

export default function InterrogationPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[]>;
}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v as string);
    } else if (typeof value === 'string') {
      qs.append(key, value);
    }
  }
  const query = qs.toString();
  redirect(`/interrogation/interview${query ? `?${query}` : ''}`);
}
