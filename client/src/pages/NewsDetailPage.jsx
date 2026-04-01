import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import newsService from "../services/newsService";
import { IMAGE_FALLBACK, formatDate, resolveImageUrl } from "../utils/format";

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function NewsDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await newsService.getById(id);
        setPost(data);
      } catch (_error) {
        setError("Không tìm thấy bài viết.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="page-stack">
        <section className="content-panel">Đang tải bài viết...</section>
      </div>
    );
  }

  if (!post || error) {
    return (
      <div className="page-stack">
        <section className="content-panel">
          <p>{error || "Không tìm thấy bài viết."}</p>
          <Link to="/news" className="ghost-button compact-button">
            Quay lại tin tức
          </Link>
        </section>
      </div>
    );
  }

  const coverSrc = post.cover_image_url
    ? resolveImageUrl(post.cover_image_url)
    : IMAGE_FALLBACK;

  return (
    <div className="page-stack">
      <section className="section-header-row">
        <div>
          <p className="eyebrow">Tin tức cửa hàng</p>
          <h1>{post.title}</h1>
        </div>
        <div className="news-meta">
          <span>{formatDate(post.published_at || post.created_at)}</span>
          <span>{post.author_name || post.author_username || "KAFIGURE"}</span>
        </div>
      </section>

      <section className="content-panel news-detail-hero">
        <div className="news-detail-cover">
          <img
            src={coverSrc}
            alt={post.title}
            onError={(e) => {
              e.currentTarget.src = IMAGE_FALLBACK;
              e.currentTarget.onerror = null;
            }}
          />
        </div>
        {post.excerpt && (
          <p className="news-excerpt">{stripHtml(post.excerpt)}</p>
        )}
      </section>

      <section className="content-panel">
        <div
          className="news-content"
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />
        <div className="news-actions">
          <Link to="/news" className="ghost-button compact-button">
            Quay lại tin tức
          </Link>
        </div>
      </section>
    </div>
  );
}

export default NewsDetailPage;
