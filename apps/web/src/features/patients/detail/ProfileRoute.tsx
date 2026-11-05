import { getRouteApi } from '@tanstack/react-router';
import { useGetPatient } from '../../../api/generated/client';
import { unwrap } from '../../../api/unwrap';
import { ProfileTab } from './ProfileTab';

const route = getRouteApi('/patients/$patientId/_detail/');

export function ProfileRoute() {
  const { patientId } = route.useParams();
  const { data: patient } = useGetPatient(patientId, { query: { select: unwrap } });
  return patient ? <ProfileTab patient={patient} /> : null;
}
