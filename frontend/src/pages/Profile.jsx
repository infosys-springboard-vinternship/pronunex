/**
 * Profile Page
 * User profile view and edit with settings management
 */

import { useState, useEffect } from 'react';
import {
    User, Mail, Globe, Award, Edit3, Save, X,
    Calendar, Shield, CheckCircle, Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { api } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { Card } from '../components/Card';
import { Spinner } from '../components/Loader';
import { AvatarSelector } from '../components/AvatarSelector';
import { getAvatarById } from '../config/avatarConfig';
import './Profile.css';

const PROFICIENCY_OPTIONS = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
];

const LANGUAGE_OPTIONS = [
    { value: '', label: 'Select language' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'english', label: 'English' },
];

export function Profile() {
    const { user, updateProfile } = useAuth();
    const { toast } = useUI();

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        native_language: '',
        proficiency_level: 'beginner',
        daily_goal_target: 10,
        avatar_id: 'avatar-1',
    });

    // Initialize form data from user
    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                full_name: user.full_name || '',
                native_language: user.native_language || '',
                proficiency_level: user.proficiency_level || 'beginner',
                daily_goal_target: user.daily_goal_target || 10,
                avatar_id: user.avatar_id || 'avatar-1',
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        // Reset to original values
        if (user) {
            setFormData({
                username: user.username || '',
                full_name: user.full_name || '',
                native_language: user.native_language || '',
                proficiency_level: user.proficiency_level || 'beginner',
                daily_goal_target: user.daily_goal_target || 10,
                avatar_id: user.avatar_id || 'avatar-1',
            });
        }
        setIsEditing(false);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateProfile(formData);
            toast.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (error) {
            toast.error(error.message || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (!user) {
        return (
            <div className="profile-loading">
                <Spinner size="lg" />
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="profile">
            <header className="profile__header">
                <div className="profile__header-content">
                    <div className="profile__avatar">
                        <img
                            src={getAvatarById(isEditing ? formData.avatar_id : user.avatar_id).src}
                            alt="Profile Avatar"
                            className="profile__avatar-image"
                        />
                    </div>
                    <div className="profile__header-info">
                        <h1 className="profile__name">{user.full_name || user.username}</h1>
                        <p className="profile__email">{user.email}</p>
                        {user.is_staff && (
                            <span className="profile__badge profile__badge--admin">
                                <Shield size={14} />
                                Administrator
                            </span>
                        )}
                    </div>
                </div>
                <div className="profile__header-actions">
                    {!isEditing ? (
                        <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={handleEdit}
                        >
                            <Edit3 size={18} />
                            <span>Edit Profile</span>
                        </button>
                    ) : (
                        <div className="profile__edit-actions">
                            <button
                                type="button"
                                className="btn btn--ghost"
                                onClick={handleCancel}
                                disabled={isLoading}
                            >
                                <X size={18} />
                                <span>Cancel</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Spinner size="sm" />
                                ) : (
                                    <Save size={18} />
                                )}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Avatar Selection - Only in edit mode */}
            {isEditing && (
                <Card variant="elevated" padding="lg" className="profile__section profile__avatar-section">
                    <AvatarSelector
                        selectedId={formData.avatar_id}
                        onSelect={(id) => setFormData((prev) => ({ ...prev, avatar_id: id }))}
                    />
                </Card>
            )}

            <div className="profile__content">
                {/* Personal Information */}
                <Card variant="elevated" padding="lg" className="profile__section">
                    <h2 className="profile__section-title">
                        <User size={20} />
                        Personal Information
                    </h2>
                    <div className="profile__fields">
                        <div className="profile__field">
                            <label className="profile__label">Username</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="username"
                                    className="profile__input"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Enter username"
                                />
                            ) : (
                                <p className="profile__value">{user.username}</p>
                            )}
                        </div>
                        <div className="profile__field">
                            <label className="profile__label">Full Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="full_name"
                                    className="profile__input"
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Enter full name"
                                />
                            ) : (
                                <p className="profile__value">{user.full_name || 'Not set'}</p>
                            )}
                        </div>
                        <div className="profile__field">
                            <label className="profile__label">Email Address</label>
                            <p className="profile__value profile__value--readonly">
                                <Mail size={16} />
                                {user.email}
                                {user.is_email_verified && (
                                    <CheckCircle size={16} className="profile__verified" />
                                )}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Language & Learning */}
                <Card variant="elevated" padding="lg" className="profile__section">
                    <h2 className="profile__section-title">
                        <Globe size={20} />
                        Language & Learning
                    </h2>
                    <div className="profile__fields">
                        <div className="profile__field">
                            <label className="profile__label">Native Language</label>
                            {isEditing ? (
                                <select
                                    name="native_language"
                                    className="profile__select"
                                    value={formData.native_language}
                                    onChange={handleChange}
                                >
                                    {LANGUAGE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="profile__value">
                                    {LANGUAGE_OPTIONS.find(
                                        (opt) => opt.value === user.native_language
                                    )?.label || user.native_language || 'Not set'}
                                </p>
                            )}
                        </div>
                        <div className="profile__field">
                            <label className="profile__label">Proficiency Level</label>
                            {isEditing ? (
                                <select
                                    name="proficiency_level"
                                    className="profile__select"
                                    value={formData.proficiency_level}
                                    onChange={handleChange}
                                >
                                    {PROFICIENCY_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="profile__value">
                                    <Award size={16} />
                                    {PROFICIENCY_OPTIONS.find(
                                        (opt) => opt.value === user.proficiency_level
                                    )?.label || 'Beginner'}
                                </p>
                            )}
                        </div>
                        <div className="profile__field">
                            <label className="profile__label">
                                <Target size={16} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                Daily Goal (sentences)
                            </label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    name="daily_goal_target"
                                    className="profile__input"
                                    value={formData.daily_goal_target}
                                    onChange={handleChange}
                                    min={1}
                                    max={50}
                                    placeholder="10"
                                />
                            ) : (
                                <p className="profile__value">
                                    {user.daily_goal_target || 10} sentences per day
                                </p>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Account Information */}
                <Card variant="elevated" padding="lg" className="profile__section">
                    <h2 className="profile__section-title">
                        <Calendar size={20} />
                        Account Information
                    </h2>
                    <div className="profile__fields">
                        <div className="profile__field">
                            <label className="profile__label">Member Since</label>
                            <p className="profile__value">{formatDate(user.created_at)}</p>
                        </div>
                        <div className="profile__field">
                            <label className="profile__label">Last Updated</label>
                            <p className="profile__value">{formatDate(user.updated_at)}</p>
                        </div>
                        <div className="profile__field">
                            <label className="profile__label">Account Status</label>
                            <p className="profile__value">
                                <span className="profile__status profile__status--active">
                                    Active
                                </span>
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default Profile;
