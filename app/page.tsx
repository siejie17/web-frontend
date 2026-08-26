import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const systemRole = cookieStore.get('system_role')?.value;

  if (token) {
    if (systemRole === 'super_admin') redirect('/admin');
    if (systemRole === 'admin') redirect('/admin');
    if (systemRole === 'facilitator_admin') redirect('/facilitator');
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
