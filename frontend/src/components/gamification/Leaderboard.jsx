import { Trophy, Medal, Award } from 'lucide-react';
import { getAvatarById } from '../../config/avatarConfig';
import './Leaderboard.css';

export function Leaderboard({ entries = [], currentUserId, leagueInfo }) {
    return (
        <div className="leaderboard">
            <div className="leaderboard__header">
                <h3 className="leaderboard__title">
                    {leagueInfo ? `${leagueInfo.current_league?.name} League` : 'Leaderboard'}
                </h3>
                <div className="leaderboard__subtitle">Weekly XP Competition</div>
            </div>
            
            {entries.length === 0 && (
                <div className="leaderboard__empty">
                    No leaderboard data available yet. Start practicing to join the competition!
                </div>
            )}
            
            <div className="leaderboard__list">
                {entries.map((entry, index) => (
                    <LeaderboardEntry
                        key={entry.user_email || index}
                        entry={entry}
                        rank={entry.rank || index + 1}
                        isCurrentUser={entry.user_email === currentUserId}
                    />
                ))}
            </div>
        </div>
    );
}

function LeaderboardEntry({ entry, rank, isCurrentUser }) {
    const avatar = getAvatarById(entry.user_avatar_id);
    
    const getRankIcon = (rank) => {
        if (rank === 1) return <Trophy className="leaderboard-entry__rank-icon" size={20} />;
        if (rank === 2) return <Medal className="leaderboard-entry__rank-icon" size={20} />;
        if (rank === 3) return <Award className="leaderboard-entry__rank-icon" size={20} />;
        return <span className="leaderboard-entry__rank-number">{rank}</span>;
    };
    
    const getRankClass = (rank) => {
        if (rank === 1) return 'leaderboard-entry--gold';
        if (rank === 2) return 'leaderboard-entry--silver';
        if (rank === 3) return 'leaderboard-entry--bronze';
        return '';
    };
    
    return (
        <div className={`
            leaderboard-entry
            ${getRankClass(rank)}
            ${isCurrentUser ? 'leaderboard-entry--current' : ''}
        `}>
            <div className="leaderboard-entry__rank">
                {getRankIcon(rank)}
            </div>
            
            <div className="leaderboard-entry__avatar">
                <img src={avatar.url} alt={entry.user_full_name || entry.user_email} />
            </div>
            
            <div className="leaderboard-entry__info">
                <div className="leaderboard-entry__name">
                    {entry.user_full_name || entry.user_email}
                    {isCurrentUser && <span className="leaderboard-entry__you">(You)</span>}
                </div>
                <div className="leaderboard-entry__xp">{entry.weekly_xp} XP</div>
            </div>
            
            {entry.promoted && (
                <div className="leaderboard-entry__badge leaderboard-entry__badge--promoted">
                    Promoted
                </div>
            )}
            {entry.demoted && (
                <div className="leaderboard-entry__badge leaderboard-entry__badge--demoted">
                    Demoted
                </div>
            )}
        </div>
    );
}

export function CompactLeaderboard({ entries = [], limit = 5 }) {
    return (
        <div className="compact-leaderboard">
            {entries.slice(0, limit).map((entry, index) => {
                const avatar = getAvatarById(entry.user_avatar_id);
                return (
                    <div key={entry.user_email || index} className="compact-leaderboard__entry">
                        <span className="compact-leaderboard__rank">{index + 1}</span>
                        <img 
                            src={avatar.url} 
                            alt={entry.user_full_name} 
                            className="compact-leaderboard__avatar"
                        />
                        <span className="compact-leaderboard__name">
                            {entry.user_full_name || entry.user_email}
                        </span>
                        <span className="compact-leaderboard__xp">{entry.weekly_xp}</span>
                    </div>
                );
            })}
        </div>
    );
}
