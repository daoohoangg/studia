"""
Learning Engine — Studia v2
Điều phối toàn bộ vòng lặp học tập cá nhân hóa:
  - generate_study_plan: Tạo lịch học theo ngày từ topics + goal
  - adapt_plan: Tái cấu trúc lịch học khi quiz score thấp
  - get_today_tasks: Tổng hợp tasks cho ngày hôm nay
  - calculate_knowledge_profile: Tổng hợp Knowledge Profile theo topic
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta, timezone
import math
import logging

logger = logging.getLogger(__name__)


class LearningEngine:
    """
    Learning Engine là trái tim của Studia.
    Nó quyết định: "Hôm nay bạn nên học gì?"
    Dựa trên:
    - Knowledge State của user (mastery, retention per topic)
    - Study Goal (deadline, daily_minutes)
    - FSRS Schedule (what's due for review)
    - Quiz Performance (adaptive rescheduling)
    """

    TASK_TYPES = {
        "lesson": {"icon": "📖", "label": "Học bài mới"},
        "quiz": {"icon": "📝", "label": "Làm Quiz"},
        "flashcard_review": {"icon": "🃏", "label": "Ôn Flashcard"},
        "spaced_repetition": {"icon": "🔄", "label": "Spaced Review"},
    }

    @staticmethod
    def generate_study_plan(
        study_goal: Dict[str, Any],
        topics: List[Dict[str, Any]],
        knowledge_states: Dict[str, float],  # topic_id -> mastery_score
    ) -> List[Dict[str, Any]]:
        """
        Tạo lịch học theo ngày dựa trên:
        - Danh sách topics đã được sắp xếp theo topology
        - Goal của user (deadline_days, daily_minutes)
        - Knowledge states hiện tại

        Trả về list daily_plan records để insert vào DB.
        """
        deadline_days = study_goal.get("deadline_days", 30)
        daily_minutes = study_goal.get("daily_minutes", 45)
        user_id = study_goal.get("user_id", "")
        study_goal_id = study_goal.get("id", "")

        # Lọc topics chưa mastered (mastery < 80%)
        unmastered_topics = [
            t for t in topics
            if knowledge_states.get(t.get("id", ""), 0) < 80
        ]

        if not unmastered_topics:
            unmastered_topics = topics  # Nếu tất cả đã mastered, ôn lại

        # Phân bổ topics theo ngày
        # Công thức: mỗi topic cần ~2 ngày (1 learn + 1 quiz/review)
        topics_per_day = max(1, daily_minutes // 30)  # ~30 phút/topic
        days_needed = min(deadline_days, math.ceil(len(unmastered_topics) * 2 / topics_per_day))

        plans = []
        topic_index = 0
        today = date.today()

        for day_num in range(days_needed):
            plan_date = today + timedelta(days=day_num)
            tasks = []
            remaining_minutes = daily_minutes
            day_phase = "learn"  # Xen kẽ learn và review

            # Pha học theo 3 ngày cycle
            day_cycle = day_num % 3
            if day_cycle == 0:  # Ngày học mới
                day_phase = "learn"
            elif day_cycle == 1:  # Ngày quiz
                day_phase = "quiz"
            else:  # Ngày review
                day_phase = "review"

            if day_phase == "learn" and topic_index < len(unmastered_topics):
                topic = unmastered_topics[topic_index]
                mastery = knowledge_states.get(topic.get("id", ""), 0)

                tasks.append({
                    "type": "lesson",
                    "topic_id": topic.get("id", ""),
                    "topic_name": topic.get("name", ""),
                    "duration_min": min(25, remaining_minutes),
                    "status": "pending",
                    "icon": "📖",
                    "difficulty": topic.get("difficulty_level", 1),
                    "current_mastery": mastery
                })
                remaining_minutes -= 25

                # Thêm flashcard review sau lesson nếu còn thời gian
                if remaining_minutes >= 10:
                    tasks.append({
                        "type": "flashcard_review",
                        "topic_id": topic.get("id", ""),
                        "topic_name": topic.get("name", ""),
                        "duration_min": 10,
                        "status": "pending",
                        "icon": "🃏",
                        "card_count": 10
                    })
                    remaining_minutes -= 10

                topic_index += 1

            elif day_phase == "quiz" and topic_index > 0:
                # Quiz cho topic vừa học hôm qua
                prev_topic = unmastered_topics[max(0, topic_index - 1)]
                mastery = knowledge_states.get(prev_topic.get("id", ""), 0)

                tasks.append({
                    "type": "quiz",
                    "topic_id": prev_topic.get("id", ""),
                    "topic_name": prev_topic.get("name", ""),
                    "duration_min": min(20, remaining_minutes),
                    "status": "pending",
                    "icon": "📝",
                    "question_count": 5,
                    "current_mastery": mastery
                })
                remaining_minutes -= 20

                # Học topic mới nếu còn đủ thời gian
                if remaining_minutes >= 25 and topic_index < len(unmastered_topics):
                    topic = unmastered_topics[topic_index]
                    tasks.append({
                        "type": "lesson",
                        "topic_id": topic.get("id", ""),
                        "topic_name": topic.get("name", ""),
                        "duration_min": min(25, remaining_minutes),
                        "status": "pending",
                        "icon": "📖",
                        "difficulty": topic.get("difficulty_level", 1),
                        "current_mastery": knowledge_states.get(topic.get("id", ""), 0)
                    })
                    remaining_minutes -= 25
                    topic_index += 1

            else:  # review day
                # Spaced repetition cho các topics đã học
                reviewed_topics = unmastered_topics[:max(1, topic_index)]
                for rtopic in reviewed_topics[:2]:  # Max 2 topics ôn mỗi ngày
                    if remaining_minutes < 10:
                        break
                    tasks.append({
                        "type": "spaced_repetition",
                        "topic_id": rtopic.get("id", ""),
                        "topic_name": rtopic.get("name", ""),
                        "duration_min": 15,
                        "status": "pending",
                        "icon": "🔄",
                        "current_mastery": knowledge_states.get(rtopic.get("id", ""), 0)
                    })
                    remaining_minutes -= 15

            if not tasks:
                continue  # Skip ngày trống

            total_minutes = sum(t.get("duration_min", 0) for t in tasks)

            plans.append({
                "user_id": user_id,
                "study_goal_id": study_goal_id,
                "plan_date": plan_date.isoformat(),
                "tasks": tasks,
                "total_minutes": total_minutes,
                "status": "pending"
            })

        return plans

    @staticmethod
    def adapt_plan(
        user_id: str,
        weak_topics: List[Dict[str, Any]],
        current_plan: List[Dict[str, Any]],
        from_date: date = None
    ) -> List[Dict[str, Any]]:
        """
        Tái cấu trúc lịch học khi phát hiện weak topics (score < 60%).
        Chèn thêm ngày ôn tập cho weak topics vào đầu lịch.

        weak_topics: [{"topic_id", "topic_name", "score_pct"}]
        """
        if not weak_topics or not current_plan:
            return current_plan

        if from_date is None:
            from_date = date.today() + timedelta(days=1)

        # Tạo review tasks cho weak topics
        review_tasks = []
        for wt in weak_topics[:3]:  # Max 3 weak topics cùng lúc
            review_tasks.append({
                "type": "lesson",
                "topic_id": wt.get("topic_id", ""),
                "topic_name": wt.get("topic_name", ""),
                "duration_min": 20,
                "status": "pending",
                "icon": "📖",
                "adapted": True,
                "adapt_reason": f"Ôn tập do Quiz score thấp ({wt.get('score_pct', 0):.0f}%)"
            })
            review_tasks.append({
                "type": "quiz",
                "topic_id": wt.get("topic_id", ""),
                "topic_name": wt.get("topic_name", ""),
                "duration_min": 15,
                "status": "pending",
                "icon": "📝",
                "question_count": 5,
                "adapted": True,
                "adapt_reason": "Review quiz sau khi ôn tập"
            })

        # Chia review tasks thành các ngày (max 45 phút/ngày)
        adapted_plans = []
        task_batch = []
        running_minutes = 0

        for task in review_tasks:
            t_min = task.get("duration_min", 15)
            if running_minutes + t_min > 45 and task_batch:
                adapted_plans.append({
                    "user_id": user_id,
                    "plan_date": from_date.isoformat(),
                    "tasks": task_batch,
                    "total_minutes": running_minutes,
                    "status": "pending",
                    "adapted_reason": "Kế hoạch được tự động điều chỉnh do cần ôn tập"
                })
                from_date += timedelta(days=1)
                task_batch = [task]
                running_minutes = t_min
            else:
                task_batch.append(task)
                running_minutes += t_min

        if task_batch:
            adapted_plans.append({
                "user_id": user_id,
                "plan_date": from_date.isoformat(),
                "tasks": task_batch,
                "total_minutes": running_minutes,
                "status": "pending",
                "adapted_reason": "Kế hoạch được tự động điều chỉnh do cần ôn tập"
            })

        # Shift existing plan dates để nhường chỗ cho adapted plans
        shift_days = len(adapted_plans)
        shifted_plans = []
        for plan in current_plan:
            try:
                plan_d = date.fromisoformat(plan.get("plan_date", ""))
                if plan_d >= (from_date - timedelta(days=shift_days)):
                    plan["plan_date"] = (plan_d + timedelta(days=shift_days)).isoformat()
            except Exception:
                pass
            shifted_plans.append(plan)

        return adapted_plans + shifted_plans

    @staticmethod
    def get_today_tasks(
        user_id: str,
        supabase_client,
        knowledge_states: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Lấy tasks hôm nay cho user:
        1. Từ daily_learning_plans
        2. Thêm flashcards đến hạn (FSRS)
        3. Tính tổng thời gian và streak
        """
        today = date.today().isoformat()
        result = {
            "plan_date": today,
            "tasks": [],
            "total_minutes": 0,
            "streak_days": 0,
            "has_plan": False,
            "knowledge_summary": []
        }

        if not supabase_client:
            return result

        try:
            # Lấy plan hôm nay
            plan_resp = supabase_client.table("daily_learning_plans") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("plan_date", today) \
                .execute()

            if plan_resp.data:
                plan = plan_resp.data[0]
                result["tasks"] = plan.get("tasks", [])
                result["total_minutes"] = plan.get("total_minutes", 0)
                result["has_plan"] = True
                result["plan_id"] = plan.get("id", "")
                result["plan_status"] = plan.get("status", "pending")

            # Đếm streak (số ngày học liên tiếp)
            streak_resp = supabase_client.table("daily_learning_plans") \
                .select("plan_date, status") \
                .eq("user_id", user_id) \
                .eq("status", "completed") \
                .order("plan_date", desc=True) \
                .limit(30) \
                .execute()

            if streak_resp.data:
                streak = LearningEngine._calculate_streak(streak_resp.data)
                result["streak_days"] = streak

            # Knowledge summary
            if knowledge_states:
                result["knowledge_summary"] = [
                    {
                        "topic_name": ks.get("topic_name", ""),
                        "mastery_score": ks.get("mastery_score", 0),
                        "next_review_at": ks.get("next_review_at", "")
                    }
                    for ks in (knowledge_states or [])[:5]
                ]

        except Exception as e:
            logger.error(f"get_today_tasks failed: {e}")

        return result

    @staticmethod
    def _calculate_streak(completed_plans: List[Dict]) -> int:
        """Tính số ngày học liên tiếp từ hôm nay trở về trước."""
        if not completed_plans:
            return 0

        streak = 0
        check_date = date.today()

        completed_dates = set()
        for plan in completed_plans:
            try:
                d = date.fromisoformat(plan.get("plan_date", ""))
                completed_dates.add(d)
            except Exception:
                pass

        while check_date in completed_dates:
            streak += 1
            check_date -= timedelta(days=1)

        return streak

    @staticmethod
    def calculate_knowledge_profile(
        knowledge_states: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Tính toán Knowledge Profile tổng thể của user.
        Trả về: overall_mastery, topic breakdown, weak areas.
        """
        if not knowledge_states:
            return {"overall_mastery": 0, "topics": [], "weak_areas": [], "strong_areas": []}

        total_mastery = sum(ks.get("mastery_score", 0) for ks in knowledge_states)
        overall = total_mastery / len(knowledge_states) if knowledge_states else 0

        topics = [
            {
                "topic_id": ks.get("topic_id", ""),
                "topic_name": ks.get("topic_name", "Unknown"),
                "mastery_score": round(ks.get("mastery_score", 0), 1),
                "confidence_score": round(ks.get("confidence_score", 0.5), 2),
                "retention_score": round(ks.get("retention_score", 1.0), 2),
                "next_review_at": ks.get("next_review_at", ""),
                "status": (
                    "mastered" if ks.get("mastery_score", 0) >= 80
                    else ("learning" if ks.get("mastery_score", 0) >= 40
                          else "struggling")
                )
            }
            for ks in knowledge_states
        ]

        weak_areas = [t for t in topics if t["mastery_score"] < 50]
        strong_areas = [t for t in topics if t["mastery_score"] >= 80]

        return {
            "overall_mastery": round(overall, 1),
            "total_topics": len(topics),
            "topics": topics,
            "weak_areas": weak_areas,
            "strong_areas": strong_areas,
            "mastered_count": len(strong_areas),
            "struggling_count": len(weak_areas)
        }
