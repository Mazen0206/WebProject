import { NextResponse } from "next/server";
import {
    getAverageFollowersPerUser,
    getAveragePostsPerUser,
    getMostActiveUserLast3Months,
    getMostFrequentWord,
    getTopLikedPosts,
    getTopPostingUsers,
    getAverageCommentsPerPost,
    getMostFollowedUser,
} from "@/lib/statistics";

export async function GET() {
    const [
        avgFollowers,
        avgPosts,
        mostActive,
        mostFrequentWord,
        topLiked,
        topPosters,
        avgCommentsPerPost,
        mostFollowed,
    ] = await Promise.all([
        getAverageFollowersPerUser(),
        getAveragePostsPerUser(),
        getMostActiveUserLast3Months(),
        getMostFrequentWord(),
        getTopLikedPosts(5),
        getTopPostingUsers(5),
        getAverageCommentsPerPost(),
        getMostFollowedUser(),
    ]);

    return NextResponse.json({
        avgFollowers,
        avgPosts,
        mostActive,
        mostFrequentWord,
        topLiked,
        topPosters,
        avgCommentsPerPost,
        mostFollowed,
    });
}
