// Cross-matching demo page
import { CrossMatchingDemo } from '@/components/cross-matching/cross-matching-demo';

export default function CrossMatchingPage() {
  return (
    <div className="container mx-auto py-8">
      <CrossMatchingDemo />
    </div>
  );
}

export const metadata = {
  title: 'Cross-Matching Engine Demo - The Ownership Layer',
  description: 'Test and demonstrate the cross-matching engine for duplicate content detection',
};
