import { useParams } from 'react-router-dom';
import { PropertyDetailPage } from './PropertyDetailPage';

export function PropertyDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <PropertyDetailPage propertyId={id ?? ''} />;
}