import { ArticleEditor } from '@/components/editorial/article-editor';
export default function Page() {
  return <ArticleEditor publicEnabled={process.env.MEDIA_PUBLIC_ENABLED === 'true'} />;
}
