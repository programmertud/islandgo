import { Outlet } from 'react-router';
import { Navbar } from '../components/Navbar';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
        </div>
    );
}
