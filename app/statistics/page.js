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

import AuthGuard from "./AuthGuard";
import "./statistics.css";

export const dynamic = "force-dynamic";

function avatar(path) {
    if (!path) return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23dde1ed'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%236b7190'/%3E%3Cellipse cx='50' cy='84' rx='28' ry='22' fill='%236b7190'/%3E%3C/svg%3E";
    if (path.startsWith("data:")) return path;
    return "/" + path;
}

function MetricCard({ title, value, subtitle, accent }) {
    return (
        <div className="stat-card" data-accent={accent}>
            <p className="stat-card__title">{title}</p>
            <p className="stat-card__value">{value}</p>
            {subtitle ? <p className="stat-card__subtitle">{subtitle}</p> : null}
        </div>
    );
}

function UserChip({ user, trailing }) {
    if (!user) return <span className="stat-empty">No data</span>;
    return (
        <div className="user-chip">
            <img src={avatar(user.profilePicture)} alt={user.username} />
            <div>
                <p className="user-chip__name">{user.username}</p>
                <p className="user-chip__handle">@{user.username}</p>
            </div>
            {trailing != null && <span className="user-chip__trailing">{trailing}</span>}
        </div>
    );
}

export default async function StatisticsPage() {
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

    return (
        <div className="stats-page">
            <AuthGuard />

            <aside className="stats-sidebar">
                <div className="stats-sidebar-logo">
                    <img src="/assets/images/zento_logo.png" alt="Zento" />
                </div>
                <nav className="stats-sidebar-nav">
                    <a href="/pages/home/index.html" className="stats-nav-link">Home</a>
                    <a href="/pages/profile/profile.html" className="stats-nav-link">Profile</a>
                    <a href="/statistics" className="stats-nav-link stats-nav-link--active">Statistics</a>
                </nav>
            </aside>

            <main className="stats-main">
                <section className="stats-hero">
                    <h1>Platform Statistics</h1>
                    <p>
                        Live, database-level insights computed with Prisma queries against
                        the Zento database. All aggregations are run inside the DB.
                    </p>
                </section>

                <section className="stats-grid">
                    <MetricCard
                        title="Avg. followers per user"
                        value={avgFollowers.average}
                        subtitle={`${avgFollowers.totalFollows} follows / ${avgFollowers.totalUsers} users`}
                        accent="blue"
                    />
                    <MetricCard
                        title="Avg. posts per user"
                        value={avgPosts.average}
                        subtitle={`${avgPosts.totalPosts} posts / ${avgPosts.totalUsers} users`}
                        accent="violet"
                    />
                    <MetricCard
                        title="Avg. comments per post"
                        value={avgCommentsPerPost.average}
                        subtitle={`${avgCommentsPerPost.totalComments} comments / ${avgCommentsPerPost.totalPosts} posts`}
                        accent="cyan"
                    />
                    <MetricCard
                        title="Most frequent word"
                        value={mostFrequentWord.top?.word ?? "—"}
                        subtitle={
                            mostFrequentWord.top?.word
                                ? `${mostFrequentWord.top.count} occurrences across all posts`
                                : "No posts yet"
                        }
                        accent="amber"
                    />
                </section>

                <section className="stats-split">
                    <article className="panel">
                        <header>
                            <h2>Most active user (last 3 months)</h2>
                            <p>Based on combined posts, comments, and likes in the window.</p>
                        </header>
                        <UserChip
                            user={mostActive.user}
                            trailing={
                                mostActive.user
                                    ? `${mostActive.activityScore} actions`
                                    : null
                            }
                        />
                        <p className="panel__hint">
                            Window start:{" "}
                            <strong>{new Date(mostActive.windowStart).toDateString()}</strong>
                        </p>
                    </article>

                    <article className="panel">
                        <header>
                            <h2>Most-followed user</h2>
                            <p>The single account with the largest follower base.</p>
                        </header>
                        <UserChip
                            user={mostFollowed}
                            trailing={mostFollowed ? `${mostFollowed.followerCount} followers` : null}
                        />
                    </article>
                </section>

                <section className="stats-split">
                    <article className="panel">
                        <header>
                            <h2>Top 5 most-liked posts</h2>
                            <p>Ordered by total number of likes (descending).</p>
                        </header>
                        <ol className="post-list">
                            {topLiked.map(post => (
                                <li key={post.id}>
                                    <div className="post-list__head">
                                        <UserChip user={post.author} />
                                        <span className="post-list__likes">
                                            {post.likeCount} ♥
                                        </span>
                                    </div>
                                    <p className="post-list__body">{post.content}</p>
                                </li>
                            ))}
                        </ol>
                    </article>

                    <article className="panel">
                        <header>
                            <h2>Top 5 content creators</h2>
                            <p>Users ranked by the number of posts they have published.</p>
                        </header>
                        <ol className="user-list">
                            {topPosters.map((u, i) => (
                                <li key={u.id}>
                                    <span className="user-list__rank">#{i + 1}</span>
                                    <UserChip
                                        user={u}
                                        trailing={`${u.postCount} posts · ${u.followerCount} followers`}
                                    />
                                </li>
                            ))}
                        </ol>
                    </article>
                </section>

                <section className="panel">
                    <header>
                        <h2>Top 10 most-used words</h2>
                        <p>Stop-words excluded. Computed across every post's content.</p>
                    </header>
                    <div className="word-cloud">
                        {mostFrequentWord.topTen.map((w, i) => (
                            <span
                                key={w.word}
                                className="word-chip"
                                style={{
                                    fontSize: `${Math.max(0.85, 1.6 - i * 0.1)}rem`,
                                }}
                            >
                                {w.word}
                                <em>{w.count}</em>
                            </span>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="stats-footer">
                <p>Zento · Statistics dashboard · CMPS 350 Phase 2</p>
            </footer>
        </div>
    );
}
