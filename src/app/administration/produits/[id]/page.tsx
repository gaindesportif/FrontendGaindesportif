import { AdminProductForm } from '@/components/admin/admin-product-form';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminProductForm id={id} />;
}
