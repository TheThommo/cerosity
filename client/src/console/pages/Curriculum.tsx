import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { useConsoleTheme } from '../ConsoleThemeProvider';

interface CourseSummary {
  slug: string;
  title: string;
  lessonCount: number;
  athletesStarted: number;
  athletesCompleted: number;
  lessonsCompleted: number;
  certificatesIssued: number;
}

interface LessonRow {
  id: number;
  slug: string;
  title: string;
  moduleTitle: string | null;
  isFreePreview: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt: string | null;
}

interface UserCourse {
  slug: string;
  title: string;
  total: number;
  completed: number;
  inProgress: number;
  percent: number;
  certificate: { certificateCode: string; issuedAt: string } | null;
  lessons: LessonRow[];
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  subscriptionTier: string;
}

function StatusPill({ status, theme }: { status: LessonRow['status']; theme: any }) {
  const colour =
    status === 'completed' ? theme.semantic.success
    : status === 'in_progress' ? theme.semantic.warning
    : theme.text.muted;
  const label = status === 'completed' ? 'completed' : status === 'in_progress' ? 'in progress' : 'not started';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      color: colour, border: `1px solid ${colour}40`, background: `${colour}14`, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function SummaryStrip({ theme }: { theme: any }) {
  const { data: summary = [], isLoading, error } = useQuery<CourseSummary[]>({
    queryKey: ['/api/admin/curriculum/summary'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  if (isLoading) return <div style={{ color: theme.text.muted, fontSize: 13, marginBottom: 24 }}>Loading course totals...</div>;
  if (error) return <div style={{ color: theme.semantic.error, fontSize: 13, marginBottom: 24 }}>Failed to load course totals</div>;

  return (
    <div style={{ display: 'grid', gap: 16, marginBottom: 28 }}>
      {summary.map(course => (
        <div key={course.slug} style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text.primary, marginBottom: 16 }}>{course.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
            {[
              { label: 'LESSONS', value: course.lessonCount },
              { label: 'ATHLETES STARTED', value: course.athletesStarted },
              { label: 'ATHLETES COMPLETED', value: course.athletesCompleted },
              { label: 'LESSONS COMPLETED', value: course.lessonsCompleted },
              { label: 'CERTIFICATES', value: course.certificatesIssued },
            ].map(stat => (
              <div key={stat.label} data-testid={`summary-${course.slug}-${stat.label.toLowerCase().replace(/ /g, '-')}`}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: theme.text.muted, marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: theme.text.primary }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {summary.length === 0 && <div style={{ color: theme.text.muted, fontSize: 13 }}>No published courses</div>}
    </div>
  );
}

function AthleteProgress({ userId, theme }: { userId: number; theme: any }) {
  const { data, isLoading, error } = useQuery<{ user: AdminUser; courses: UserCourse[] }>({
    queryKey: [`/api/admin/users/${userId}/curriculum`],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  if (isLoading) return <div style={{ color: theme.text.muted, fontSize: 13, padding: 20 }}>Loading progress...</div>;
  if (error) return <div style={{ color: theme.semantic.error, fontSize: 13, padding: 20 }}>Failed to load progress</div>;
  if (!data) return null;

  return (
    <div>
      {data.courses.map(course => (
        <div key={course.slug} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text.primary }}>{course.title}</div>
            <div data-testid={`progress-${course.slug}`} style={{ fontSize: 13, color: theme.text.secondary }}>
              {course.completed} of {course.total} lessons · {course.percent}%
            </div>
          </div>
          <div style={{ height: 6, background: theme.surfaces.sunken, borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: `${course.percent}%`, height: '100%', background: theme.brand.blue }} />
          </div>
          {course.certificate && (
            <div style={{ fontSize: 12, color: theme.semantic.success, marginBottom: 12 }}>
              Certificate {course.certificate.certificateCode}
            </div>
          )}
          <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, overflow: 'hidden' }}>
            {course.lessons.map(lesson => (
              <div key={lesson.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '8px 12px', borderBottom: `1px solid ${theme.border.default}`,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: theme.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
                  {lesson.moduleTitle && <div style={{ fontSize: 11, color: theme.text.muted }}>{lesson.moduleTitle}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {lesson.completedAt && (
                    <span style={{ fontSize: 11, color: theme.text.muted }}>{new Date(lesson.completedAt).toLocaleDateString()}</span>
                  )}
                  <StatusPill status={lesson.status} theme={theme} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Curriculum() {
  const { theme } = useConsoleTheme();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  const filtered = users.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0 }}>Curriculum</h1>
        <p style={{ fontSize: 13, color: theme.text.muted, margin: '4px 0 0' }}>Course take-up and per-athlete lesson progress</p>
      </div>

      <SummaryStrip theme={theme} />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ background: theme.surfaces.raised, border: `1px solid ${theme.border.default}`, borderRadius: 10, padding: 12 }}>
          <input
            placeholder="Search athletes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', marginBottom: 10, background: theme.surfaces.sunken, border: `1px solid ${theme.border.default}`, borderRadius: 6, color: theme.text.primary, fontSize: 13, boxSizing: 'border-box' }}
          />
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {filtered.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 2,
                  background: selectedId === u.id ? theme.brand.blueMuted : 'transparent',
                  color: selectedId === u.id ? theme.brand.blue : theme.text.secondary,
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {u.email}
              </button>
            ))}
            {filtered.length === 0 && <div style={{ fontSize: 12, color: theme.text.muted, padding: 8 }}>No athletes found</div>}
          </div>
        </div>

        <div>
          {selectedId === null
            ? <div style={{ color: theme.text.muted, fontSize: 13, padding: 20 }}>Pick an athlete to see their lesson progress.</div>
            : <AthleteProgress userId={selectedId} theme={theme} />}
        </div>
      </div>
    </div>
  );
}
