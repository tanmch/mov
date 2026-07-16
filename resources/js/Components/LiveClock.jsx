import { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

// Self-contained live clock. The 1-second interval lives here so it only
// re-renders this small component instead of the whole page that embeds it.
export default function LiveClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <p className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-mono">
                    {time}
                </p>
            </div>
            <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs font-medium text-gray-600">{date}</p>
            </div>
        </div>
    );
}
