// frontend-web/src/components/common/WelcomeReminderModal.jsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCalendar, FiX } from 'react-icons/fi';
import { notificationAPI, sessionAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const STORAGE_KEY = 'skillswap_welcome_reminder_shown';

const WelcomeReminderModal = () => {
  const { user, getUserId } = useAuth();
  const [open, setOpen] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();
    if (!user && !userId) return;
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return;

    const loadReminders = async () => {
      try {
        setLoading(true);
        const [sessionsRes, notificationsRes] = await Promise.all([
          sessionAPI.getAll(),
          notificationAPI.getNotifications()
        ]);

        const now = new Date();
        const upcoming = (sessionsRes.data || []).filter((session) => {
          const sessionDate = new Date(session.date);
          return (
            sessionDate > now &&
            session.status !== 'completed' &&
            session.status !== 'cancelled'
          );
        });

        const allNotifications = notificationsRes.data?.notifications || [];
        const unread = notificationsRes.data?.unreadCount || 0;

        if (upcoming.length === 0 && unread === 0) {
          sessionStorage.setItem(STORAGE_KEY, '1');
          return;
        }

        setUpcomingSessions(upcoming.slice(0, 3));
        setNotifications(allNotifications.filter((n) => !n.isRead).slice(0, 3));
        setUnreadCount(unread);
        setOpen(true);
      } catch (error) {
        console.error('Welcome reminder load failed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReminders();
  }, [user, getUserId]);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  if (loading || !open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Welcome back to SkillSwap</h2>
              <p className="text-indigo-100 text-sm mt-1">
                You have updates that may need your attention.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="p-1 rounded-lg hover:bg-white/10"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {upcomingSessions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiCalendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">
                  Upcoming sessions ({upcomingSessions.length}
                  {upcomingSessions.length >= 3 ? '+' : ''})
                </h3>
              </div>
              <ul className="space-y-2">
                {upcomingSessions.map((session) => (
                  <li
                    key={session._id}
                    className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-900">
                      {session.skillName || session.title || 'Learning session'}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(session.date).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {unreadCount > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FiBell className="w-5 h-5 text-violet-600" />
                <h3 className="font-semibold text-gray-900">
                  Unread notifications ({unreadCount})
                </h3>
              </div>
              <ul className="space-y-2">
                {notifications.map((notification) => (
                  <li
                    key={notification._id}
                    className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-900">{notification.title}</p>
                    {notification.message && (
                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">{notification.message}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
          {upcomingSessions.length > 0 && (
            <Link
              to="/sessions"
              onClick={dismiss}
              className="px-4 py-2 text-sm rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              View sessions
            </Link>
          )}
          {unreadCount > 0 && (
            <Link
              to="/dashboard"
              onClick={dismiss}
              className="px-4 py-2 text-sm rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              View notifications
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeReminderModal;
