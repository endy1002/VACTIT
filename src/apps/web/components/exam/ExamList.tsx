'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import ExamCard, { ExamData } from './ExamCard';
import ExamModal from './ExamModal';
import Loading from '../ui/LoadingSpinner';
import { useCurrentUser } from '@/lib/swr-hooks';

type FilterMode = 'all' | 'inProgress' | 'practice';
type SortKey = 'date' | 'title' | 'plays';
type SortDir = 'asc' | 'desc';

interface ExamListProps {
    filterMode?: FilterMode;
    sortKey?: SortKey;
    sortDir?: SortDir;
}

export default function ExamList({ filterMode = 'all', sortKey = 'date', sortDir = 'desc' }: ExamListProps) {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('query')?.toLowerCase() || '';

    // Lấy user info
    const { user, isLoading: isAuthLoading } = useCurrentUser();
    // Fallback nhiều trường hợp để đảm bảo lấy được ID
    const currentUserId = user?.user_id || user?.id || user?.sub;

    // State lưu trữ các nhóm bài thi
    const [groupedExams, setGroupedExams] = useState<{
        inProgress: ExamData[];
        countdown: ExamData[];
        upcoming: ExamData[];
        locked: ExamData[];
        practice: ExamData[];
    }>({
        inProgress: [],
        countdown: [],
        upcoming: [],
        locked: [],
        practice: []
    });

    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState<ExamData | null>(null);
    const [sortOrder, setSortOrder] = useState('newest');

    // --- LOGIC FETCH DATA ---
    useEffect(() => {
        // Điều này đảm bảo API tests không bao giờ bị gọi với userId = undefined
        if (isAuthLoading) return;

        const initData = async () => {
            setLoading(true);

            try {
                // Backend API đã được thiết kế để:
                // 1. Trả về tổng số lượt thi trong `_count.trials`
                // 2. Trả về lượt thi CỦA USER trong `trials` (nhờ tham số userId gửi xuống)
                const response = await api.tests.getAll({
                    query: searchQuery,
                    category: 'all',
                    limit: 100,
                    userId: currentUserId, 
                    sort: sortKey === 'date' ? (sortDir === 'desc' ? 'newest' : 'oldest') : undefined,
                });

                const rawData = response.data || [];
                const now = new Date().getTime();
                const oneDayMs = 24 * 60 * 60 * 1000;

                const groups = {
                    inProgress: [] as ExamData[],
                    countdown: [] as ExamData[],
                    upcoming: [] as ExamData[],
                    locked: [] as ExamData[],
                    practice: [] as ExamData[],
                };

                rawData.forEach((item: any) => {
                    // [LOGIC 1]: Xác định User đã làm bài này chưa?
                    // Vì backend đã lọc `trials` theo userId, nên nếu mảng này có phần tử => User đã làm.
                    const userPersonalTrials = item.trials || []; 
                    const isTaken = userPersonalTrials.length > 0;

                    // [LOGIC 2]: Lấy tổng số lượt thi của TOÀN BỘ User
                    // Backend trả về trong `_count`
                    const globalTotalTrials = item._count?.trials || 0;

                    const exam: ExamData = {
                        id: item.test_id,
                        title: item.title,
                        author: item.author?.name || 'Unknown',
                        questions: item._count?.questions || 0,
                        
                        // HIỂN THỊ: Tổng số lượt thi của tất cả mọi người
                        totalTrials: globalTotalTrials, 
                        
                        duration: item.duration ? Number(item.duration) : 0,
                        date: item.start_time || item.created_at || new Date().toISOString(),
                        startTime: item.start_time,
                        dueTime: item.due_time,
                        
                        // TRẠNG THÁI: Tính dựa trên việc User hiện tại đã làm hay chưa
                        status: isTaken ? 'completed' : 'not_started',
                        
                        type: item.type,
                        subject: 'Tổng hợp',
                        isVip: item.status === 'Premium',
                    };

                    // --- PHÂN NHÓM (Dựa trên status của User và Thời gian) ---
                    if (exam.type === 'practice') {
                        groups.practice.push(exam);
                    } else {
                        // Nếu là Exam và User ĐÃ LÀM -> Khóa (Locked)
                        if (isTaken) {
                            groups.locked.push(exam);
                        } else {
                            const start = exam.startTime ? new Date(exam.startTime).getTime() : 0;
                            const due = exam.dueTime ? new Date(exam.dueTime).getTime() : Infinity;

                            if (now >= start && now <= due) {
                                groups.inProgress.push(exam);
                            } else if (now < start) {
                                if (start - now <= oneDayMs) {
                                    groups.countdown.push(exam);
                                } else {
                                    groups.upcoming.push(exam);
                                }
                            } else if (now > due) {
                                groups.locked.push(exam);
                            }
                        }
                    }
                });

                setGroupedExams(groups);
            } catch (error) {
                console.error("Failed to fetch exams:", error);
            } finally {
                setLoading(false);
            }
        };

        initData();

        // Thêm isAuthLoading và currentUserId vào dependency
        // Khi Auth load xong -> isAuthLoading false -> useEffect chạy lại -> gọi API đúng
    }, [searchQuery, sortKey, sortDir, currentUserId, isAuthLoading]);

    const sortList = (list: ExamData[]) => {
        const sorted = [...list];
        sorted.sort((a, b) => {
            if (sortKey === 'title') {
                return sortDir === 'asc'
                    ? (a.title || '').localeCompare(b.title || '')
                    : (b.title || '').localeCompare(a.title || '');
            }
            if (sortKey === 'plays') {
                const aCount = a.totalTrials || 0;
                const bCount = b.totalTrials || 0;
                return sortDir === 'asc' ? aCount - bCount : bCount - aCount;
            }
            // default: date
            const aDate = a.date ? new Date(a.date).getTime() : 0;
            const bDate = b.date ? new Date(b.date).getTime() : 0;
            return sortDir === 'asc' ? aDate - bDate : bDate - aDate;
        });
        return sorted;
    };

    const sortedGroups = useMemo(() => {
        return {
            inProgress: sortList(groupedExams.inProgress),
            countdown: sortList(groupedExams.countdown),
            upcoming: sortList(groupedExams.upcoming),
            locked: sortList(groupedExams.locked),
            practice: sortList(groupedExams.practice),
        };
    }, [groupedExams, sortKey, sortDir]);

    const visibleGroups = useMemo(() => {
        if (filterMode === 'inProgress') {
            return { ...sortedGroups, countdown: [], upcoming: [], locked: [], practice: [] };
        }
        if (filterMode === 'practice') {
            return { ...sortedGroups, inProgress: [], countdown: [], upcoming: [], locked: [] };
        }
        return sortedGroups;
    }, [sortedGroups, filterMode]);

    const SectionHeader = ({ title, icon, colorClass, count }: any) => {
        if (count === 0) return null;
        return (
            <div className={`flex items-center gap-2 mb-4 mt-8 pb-2 border-b border-gray-100 ${colorClass}`}>
                {icon && <span className="text-xl">{icon}</span>}
                <h2 className="text-lg font-bold uppercase tracking-wide">{title}</h2>
                <span className="ml-auto text-xs font-semibold bg-gray-100 px-2 py-1 rounded-full text-gray-500">{count} bài</span>
            </div>
        );
    };

    return (
        <>
            {/* Header & Sort Control */}
            {loading && <Loading />}

            <div className="flex-1 overflow-y-auto pr-2 pb-6 custom-scrollbar p-2">
                {!loading && (
                    <>
                        {/* 1. ĐANG DIỄN RA */}
                        <SectionHeader title="Đang diễn ra" icon="" colorClass="text-red-600 border-red-100" count={visibleGroups.inProgress.length} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {visibleGroups.inProgress.map(exam => (
                                <div key={exam.id} className="h-full transform transition-all duration-300 hover:scale-105 hover:z-10">
                                    <ExamCard exam={exam} onSelect={() => setSelectedExam(exam)} categoryContext="in_progress" currentUserId={currentUserId} />
                                </div>
                            ))}
                        </div>

                        {/* 2. LUYỆN TẬP */}
                        <SectionHeader title="Kho đề luyện tập" icon="" colorClass="text-teal-600 border-teal-100" count={visibleGroups.practice.length} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {visibleGroups.practice.map(exam => (
                                <div key={exam.id} className="h-full transform transition-all duration-300 hover:scale-105 hover:z-10">
                                    <ExamCard exam={exam} onSelect={() => setSelectedExam(exam)} categoryContext="countdown" currentUserId={currentUserId} />
                                </div>
                            ))}
                        </div>

                        {/* 3. ĐÃ KẾT THÚC */}
                        <SectionHeader title="Đã kết thúc" icon="" colorClass="text-gray-500 border-gray-200" count={visibleGroups.locked.length} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {visibleGroups.locked.map(exam => (
                                <div key={exam.id} className="h-full opacity-90 hover:opacity-100 transition-opacity">
                                    <ExamCard
                                        exam={exam}
                                        onSelect={() => setSelectedExam(exam)}
                                        categoryContext="locked"
                                        currentUserId={currentUserId}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* 4. SẮP BẮT ĐẦU*/}
                        <SectionHeader title="Sắp bắt đầu (24h)" icon="" colorClass="text-orange-600 border-orange-100" count={visibleGroups.countdown.length} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {visibleGroups.countdown.map(exam => (
                                <div key={exam.id} className="h-full transform transition-all duration-300 hover:scale-105 hover:z-10">
                                    <ExamCard
                                        exam={exam}
                                        onSelect={() => setSelectedExam(exam)}
                                        categoryContext="countdown"
                                        currentUserId={currentUserId}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* 5. SẮP TỚI */}
                        <SectionHeader title="Sự kiện sắp tới" icon=""  colorClass="text-blue-600 border-blue-100" count={visibleGroups.upcoming.length} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {visibleGroups.upcoming.map(exam => (
                                <div key={exam.id} className="h-full transform transition-all duration-300 hover:scale-105 hover:z-10">
                                    <ExamCard
                                        exam={exam}
                                        onSelect={() => setSelectedExam(exam)}
                                        categoryContext="upcoming"
                                        currentUserId={currentUserId}
                                    />
                                </div>
                            ))}
                        </div>

                        {Object.values(visibleGroups).every(arr => arr.length === 0) && (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 mt-8">
                                <p className="font-medium">Chưa có bài thi nào phù hợp.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedExam && (
                <ExamModal
                    exam={selectedExam}
                    onClose={() => setSelectedExam(null)}
                    currentUserId={currentUserId}
                />
            )}
        </>
    );
}