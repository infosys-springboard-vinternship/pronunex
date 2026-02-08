import { useMemo } from 'react';
import { Flame, Snowflake } from 'lucide-react';
import './StreakCalendar.css';

export function StreakCalendar({ streakData }) {
    const currentStreak = streakData?.current_streak || 0;
    const longestStreak = streakData?.longest_streak || 0;
    const calendar = streakData?.practice_calendar || {};
    const freezesAvailable = streakData?.streak_freezes_available || 0;
    
    const calendarDays = useMemo(() => {
        const days = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const hasPracticed = calendar[dateStr] === true;
            const isToday = i === 0;
            
            days.push({
                date: dateStr,
                day: date.getDate(),
                hasPracticed,
                isToday
            });
        }
        
        return days;
    }, [calendar]);
    
    return (
        <div className="streak-calendar">
            <div className="streak-calendar__header">
                <div className="streak-calendar__stat">
                    <Flame className="streak-calendar__flame" size={28} />
                    <div>
                        <div className="streak-calendar__number">{currentStreak}</div>
                        <div className="streak-calendar__label">Day Streak</div>
                    </div>
                </div>
                
                <div className="streak-calendar__freeze">
                    <Snowflake size={20} />
                    <span>{freezesAvailable}</span>
                </div>
            </div>
            
            <div className="streak-calendar__grid">
                {calendarDays.map((day) => (
                    <div
                        key={day.date}
                        className={`
                            streak-calendar__day
                            ${day.hasPracticed ? 'streak-calendar__day--active' : ''}
                            ${day.isToday ? 'streak-calendar__day--today' : ''}
                        `}
                        title={day.date}
                    >
                        {day.hasPracticed && <div className="streak-calendar__dot" />}
                    </div>
                ))}
            </div>
            
            <div className="streak-calendar__footer">
                Longest: {longestStreak} days
            </div>
        </div>
    );
}

export function CompactStreak({ streakData }) {
    const currentStreak = streakData?.current_streak || 0;
    
    return (
        <div className="compact-streak">
            <Flame className="compact-streak__flame" size={24} />
            <span className="compact-streak__number">{currentStreak}</span>
            <span className="compact-streak__label">day streak</span>
        </div>
    );
}
