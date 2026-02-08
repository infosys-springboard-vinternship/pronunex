import { CheckCircle, Circle } from 'lucide-react';
import './DailyQuests.css';

export function DailyQuests({ quests = [] }) {
    return (
        <div className="daily-quests">
            <h3 className="daily-quests__title">Daily Quests</h3>
            
            {quests.length === 0 && (
                <div className="daily-quests__empty">
                    No quests available today. Start practicing to generate quests!
                </div>
            )}
            
            <div className="daily-quests__list">
                {quests.map((quest) => (
                    <QuestItem key={quest.id} quest={quest} />
                ))}
            </div>
        </div>
    );
}

function QuestItem({ quest }) {
    const progress = quest.progress_percentage || 0;
    const isCompleted = quest.is_completed;
    
    return (
        <div className={`quest-item ${isCompleted ? 'quest-item--completed' : ''}`}>
            <div className="quest-item__icon">
                {isCompleted ? (
                    <CheckCircle className="quest-item__check" size={24} />
                ) : (
                    <Circle className="quest-item__circle" size={24} />
                )}
            </div>
            
            <div className="quest-item__content">
                <div className="quest-item__header">
                    <span className="quest-item__title">{quest.title}</span>
                    <span className="quest-item__rewards">
                        +{quest.xp_reward} XP
                        {quest.gems_reward > 0 && ` | +${quest.gems_reward} Gems`}
                    </span>
                </div>
                
                <p className="quest-item__description">{quest.description}</p>
                
                {!isCompleted && (
                    <div className="quest-item__progress">
                        <div className="quest-item__progress-bar">
                            <div 
                                className="quest-item__progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="quest-item__progress-text">
                            {quest.current_progress}/{quest.target_value}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function CompactQuests({ quests = [] }) {
    const completedCount = quests.filter(q => q.is_completed).length;
    const totalCount = quests.length;
    
    return (
        <div className="compact-quests">
            <div className="compact-quests__header">
                <span className="compact-quests__title">Daily Quests</span>
                <span className="compact-quests__count">
                    {completedCount}/{totalCount}
                </span>
            </div>
            
            <div className="compact-quests__bars">
                {quests.map((quest, index) => (
                    <div 
                        key={quest.id || index}
                        className={`
                            compact-quests__bar
                            ${quest.is_completed ? 'compact-quests__bar--completed' : ''}
                        `}
                        title={quest.title}
                    >
                        <div 
                            className="compact-quests__bar-fill"
                            style={{ width: `${quest.progress_percentage || 0}%` }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
