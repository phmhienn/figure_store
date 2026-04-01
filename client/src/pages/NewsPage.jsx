import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import newsService from "../services/newsService";
import { IMAGE_FALLBACK, formatDate, resolveImageUrl } from "../utils/format";

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function NewsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await newsService.getPublished();
        setPosts(data);
      } catch (_error) {
        setError("Không thể tải tin tức lúc này.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="page-stack">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Tin tức cửa hàng</p>
          <h1>Bài viết mới nhất</h1>
        </div>
        <p>Cập nhật nhanh tin preorder, hàng mới về, và sự kiện sưu tầm.</p>
      </section>

      <section className="content-panel">
        {loading && <p>Đang tải tin tức...</p>}
        {!loading && error && <p>{error}</p>}
        {!loading && !error && !posts.length && (
          <p>Chưa có bài viết nào được đăng.</p>
        )}

        {!loading && !error && !!posts.length && (
          <div className="news-grid">
            {posts.map((post) => {
              const coverSrc = post.cover_image_url
                ? resolveImageUrl(post.cover_image_url)
                : IMAGE_FALLBACK;

              return (
                <article key={post.news_id} className="news-card">
                  <Link to={`/news/${post.news_id}`} className="news-cover">
                    <img
                      src={coverSrc}
                      alt={post.title}
                      onError={(e) => {
                        e.currentTarget.src = IMAGE_FALLBACK;
                        e.currentTarget.onerror = null;
                      }}
                    />
                  </Link>

                  <div className="news-meta">
                    <span>
                      {formatDate(post.published_at || post.created_at)}
                    </span>
                    <span>
                      {post.author_name || post.author_username || "KAFIGURE"}
                    </span>
                  </div>

                  <h3>{post.title}</h3>
                  <p>{stripHtml(post.excerpt || post.content || "")}</p>

                  <Link
                    to={`/news/${post.news_id}`}
                    className="ghost-button compact-button"
                  >
                    Xem chi tiết
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default NewsPage;
