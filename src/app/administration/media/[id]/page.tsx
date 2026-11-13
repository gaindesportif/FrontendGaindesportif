import { ArticleEditor } from '@/components/editorial/article-editor';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ArticleEditor publicEnabled={process.env.MEDIA_PUBLIC_ENABLED === 'true'} key={id} id={id} />
  );
}
