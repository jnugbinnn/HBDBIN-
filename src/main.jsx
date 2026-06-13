import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ImagePlus,
  LockKeyhole,
  PenLine,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { supabase, supabaseEnvMissing } from './lib/supabase';
import './styles.css';
import homeLogo from '../asset/image/logo-current.jpg';

const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'card-covers';
const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
const emptyCardsMessage = '아직 도착한 카드가 없어요.\n첫 번째 생일 카드를 남겨보세요.';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        {supabaseEnvMissing && <EnvWarning />}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/write" element={<WritePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/wall" element={<HomePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function EnvWarning() {
  useEffect(() => {
    console.warn(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Update Desktop/hbd/.env and restart npm run dev.',
    );
  }, []);

  return (
    <div className="env-warning" role="alert">
      Supabase 환경변수가 비어 있어요. Desktop/hbd/.env의 VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY를 확인한 뒤 개발 서버를 재시작해 주세요.
    </div>
  );
}

function HomePage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let loadingTimer;

    async function fetchPublicCards() {
      setLoading(true);
      loadingTimer = window.setTimeout(() => {
        if (!mounted) return;
        setError(emptyCardsMessage);
        setCards([]);
        setLoading(false);
      }, 6000);

      const response = await supabase
        .from('public_cards')
        .select('id,image_url,created_at')
        .order('created_at', { ascending: false });

      if (!mounted) return;
      window.clearTimeout(loadingTimer);

      if (response.error) {
        console.warn('Public cards query failed:', response.error);
        setError(emptyCardsMessage);
        setCards([]);
      } else {
        setError('');
        setCards(response.data ?? []);
      }

      setLoading(false);
    }

    fetchPublicCards();
    return () => {
      mounted = false;
      window.clearTimeout(loadingTimer);
    };
  }, []);

  const visibleCards = cards.filter((card) => card.image_url);
  const carouselCards = visibleCards.length > 0 ? visibleCards : [];
  const renderedCards = carouselCards.slice(0, 12);

  return (
    <main className="home-page page">
      <nav className="top-nav" aria-label="사이트 메뉴">
        <Link to="/admin">Admin</Link>
      </nav>

      <section className="home-copy">
        <p className="eyebrow home-eyebrow">
          생일 축하 메세지를 남겨줘..
        </p>
        <img className="home-logo" src={homeLogo} alt="HBD BIN!" />
        <p className="home-description">
          벌써 한 해의 절반이 지났네요..
          <br />
          그 말은 즉슨, 제 생일이 다가왔다는 말인데요.
          <br />
          생일 축하 한마디 남겨주시면 남은 하반기, 열심히 살아보도록 하겠습니다.
        </p>
      </section>

      <section className="carousel-stage" aria-label="공개 카드 표지 캐러셀">
        {loading || error || renderedCards.length === 0 ? (
          <div className="empty-carousel">
            {error || emptyCardsMessage}
          </div>
        ) : (
          <div className="card-carousel" style={{ '--card-count': renderedCards.length }}>
            {renderedCards.map((card, index) => (
              <article
                className="cover-card"
                key={card.id ?? `${card.created_at}-${index}`}
                style={{
                  '--index': index,
                  '--depth-delay-desktop': `${-(28 / renderedCards.length) * index}s`,
                  '--depth-delay-mobile': `${-(46 / renderedCards.length) * index}s`,
                }}
              >
                <img src={card.image_url} alt="생일 카드 표지" />
                <div className="cover-card-shine" />
                <span>{formatShortDate(card.created_at)}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="home-actions">
        <Link className="primary-btn home-write-button" to="/write">
          카드 작성하러 가기
        </Link>
      </div>
    </main>
  );
}

function WritePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', message: '', file: null });
  const [previewUrl, setPreviewUrl] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    form.name.trim().length > 0 &&
    form.message.trim().length > 0 &&
    Boolean(form.file) &&
    !isSubmitting;

  useEffect(() => {
    if (!form.file) {
      setPreviewUrl('');
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(form.file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [form.file]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', message: '이미지 파일만 선택할 수 있어요.' });
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setStatus({ type: 'error', message: '이미지는 30MB 이하로 선택해 주세요.' });
      return;
    }

    setStatus({ type: 'idle', message: '' });
    updateField('file', file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setStatus({ type: 'loading', message: '이미지를 모바일에 맞게 압축하는 중이에요.' });

    let compressedImage;
    try {
      compressedImage = await resizeImageForUpload(form.file);
    } catch (resizeError) {
      console.error('Image resize failed:', resizeError);
      setStatus({
        type: 'error',
        message: '이미지를 처리하지 못했어요. 다른 사진으로 다시 시도해 주세요.',
      });
      setIsSubmitting(false);
      return;
    }

    const imagePath = createImagePath(compressedImage.extension);
    const uploadFile = new File([compressedImage.blob], imagePath.split('/').pop(), {
      type: compressedImage.blob.type,
    });

    setStatus({ type: 'loading', message: '압축한 이미지를 업로드하는 중이에요.' });

    const { error: uploadError } = await supabase.storage.from(storageBucket).upload(imagePath, uploadFile, {
      cacheControl: '3600',
      contentType: uploadFile.type,
      upsert: false,
    });

    if (uploadError) {
      console.error('Supabase image upload failed:', {
        error: uploadError,
        message: uploadError.message,
        status: uploadError.status,
        statusCode: uploadError.statusCode,
      });
      setStatus({
        type: 'error',
        message: `이미지 업로드에 실패했어요: ${uploadError.message}`,
      });
      setIsSubmitting(false);
      return;
    }

    const { data: publicImage } = supabase.storage.from(storageBucket).getPublicUrl(imagePath);
    const imageUrl = publicImage.publicUrl;

    setStatus({ type: 'loading', message: '카드 내용을 저장하는 중이에요.' });

    const { error: insertError } = await supabase.from('birthday_messages').insert({
      name: form.name.trim(),
      message: form.message.trim(),
      image_url: imageUrl,
      image_path: imagePath,
      is_public: true,
    });

    if (insertError) {
      console.error('Supabase card insert failed:', {
        error: insertError,
        message: insertError.message,
        status: insertError.status,
      });
      await supabase.storage.from(storageBucket).remove([imagePath]);
      setStatus({
        type: 'error',
        message: `카드 저장에 실패했어요: ${insertError.message}`,
      });
      setIsSubmitting(false);
      return;
    }

    setStatus({ type: 'success', message: '카드가 조용히 도착했어요.' });
    window.setTimeout(() => navigate('/'), 800);
  };

  return (
    <main className="page content-page write-page">
      <HeaderLink />
      <section className="write-layout">
        <form className="panel write-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="eyebrow write-eyebrow">
              Send a Private Card
            </p>
            <h1>카드를 작성해줘!</h1>
            <p className="write-description">표지는 모두에게 보이고, 이름과 메시지는 관리자에게만 보여요.</p>
          </div>

          <label>
            <span>작성자 이름</span>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              maxLength={32}
              placeholder="예: 민지"
            />
          </label>

          <label>
            <span>생일 축하 메시지</span>
            <textarea
              value={form.message}
              onChange={(event) => updateField('message', event.target.value)}
              maxLength={700}
              placeholder="축하하는 마음을 적어주세요."
            />
          </label>

          <label className={`file-picker ${isSubmitting ? 'disabled' : ''}`}>
            <input accept="image/*" disabled={isSubmitting} onChange={handleImageChange} type="file" />
            <ImagePlus size={21} />
            <span>{form.file ? form.file.name : '카드 표지 이미지 선택'}</span>
          </label>

          <button className="primary-btn submit-btn home-write-button" disabled={!canSubmit} type="submit">
            <Send size={18} />
            {isSubmitting ? '업로드 중...' : '제출하기'}
          </button>
          {status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
        </form>

        <aside className="cover-preview panel">
          <p className="preview-label">표지 미리보기</p>
          <div className="cover-frame">
            {previewUrl ? (
              <img src={previewUrl} alt="선택한 카드 표지 미리보기" />
            ) : (
              <div className="preview-placeholder">
                <ImagePlus size={34} />
                <span>이미지를 선택하면 표지가 보여요</span>
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function AdminPage() {
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(() => sessionStorage.getItem('hbd-admin-ok') === 'true');
  const [authError, setAuthError] = useState('');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!authorized) return;
    fetchAdminCards();
  }, [authorized]);

  const handleLogin = (event) => {
    event.preventDefault();

    /*
      This password gate is only a temporary guard for a personal project.
      Vite env values are shipped to the browser, so real privacy must be
      enforced with Supabase RLS, private admin auth, or server-side logic.
    */
    if (!adminPassword) {
      setAuthError('.env에 VITE_ADMIN_PASSWORD를 먼저 설정해 주세요.');
      return;
    }

    if (password === adminPassword) {
      sessionStorage.setItem('hbd-admin-ok', 'true');
      setAuthorized(true);
      setAuthError('');
      return;
    }

    setAuthError('비밀번호가 맞지 않아요.');
  };

  async function fetchAdminCards() {
    setLoading(true);
    setNotice('');

    const { data, error } = await supabase
      .from('birthday_messages')
      .select('id,name,message,image_url,image_path,is_public,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42501') {
        console.warn('Admin card query needs Supabase SELECT permission for birthday_messages.', error);
        setNotice('');
      } else {
        setNotice('관리자 카드 목록을 불러오지 못했어요. Supabase 설정을 확인해 주세요.');
      }
      setCards([]);
    } else {
      setCards(data ?? []);
    }

    setLoading(false);
  }

  const handleDelete = async (card) => {
    const confirmed = window.confirm('이 카드를 삭제할까요? 삭제 후 되돌릴 수 없어요.');
    if (!confirmed) return;

    setNotice('카드를 삭제하는 중이에요.');

    const { error } = await supabase.from('birthday_messages').delete().eq('id', card.id);

    if (error) {
      setNotice('카드 삭제에 실패했어요. Supabase delete 정책을 확인해 주세요.');
      return;
    }

    if (card.image_path) {
      await supabase.storage.from(storageBucket).remove([card.image_path]);
    }

    setCards((current) => current.filter((item) => item.id !== card.id));
    setNotice('카드를 삭제했어요.');
  };

  if (!authorized) {
    return (
      <main className="page content-page admin-login-page">
        <HeaderLink />
        <form className="panel admin-login" onSubmit={handleLogin}>
          <p className="eyebrow">
            <LockKeyhole size={15} />
            Admin Only
          </p>
          <h1>관리자 입장</h1>
          <label>
            <span>비밀번호</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="관리자 비밀번호"
              type="password"
            />
          </label>
          <button className="primary-btn submit-btn" type="submit">
            확인
          </button>
          {authError && <p className="form-status error">{authError}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="page content-page admin-page">
      <div className="admin-top">
        <HeaderLink />
        <button className="secondary-btn compact" onClick={fetchAdminCards} type="button">
          새로고침
        </button>
      </div>

      <section className="wall-heading">
        <p className="eyebrow">
          <LockKeyhole size={15} />
          Private Admin Archive
        </p>
        <h1>도착한 카드 전체 보기</h1>
      </section>

      {notice && <div className="admin-notice">{notice}</div>}
      {loading ? (
        <div className="empty-state">카드를 불러오는 중이에요.</div>
      ) : cards.length === 0 && !notice ? (
        <div className="empty-state">아직 도착한 카드가 없어요.</div>
      ) : (
        <section className="admin-list">
          {cards.map((card) => (
            <article className="admin-card" key={card.id}>
              <img src={card.image_url} alt={`${card.name} 카드 표지`} />
              <div className="admin-card-body">
                <div>
                  <strong>{card.name}</strong>
                  <p className="admin-date">
                    <CalendarDays size={14} />
                    {formatDate(card.created_at)}
                  </p>
                </div>
                <p className="admin-message">{card.message}</p>
              </div>
              <button className="danger-btn" onClick={() => handleDelete(card)} type="button">
                <Trash2 size={17} />
                삭제
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function HeaderLink() {
  return (
    <Link className="back-link" to="/">
      <ArrowLeft size={18} />
      처음으로
    </Link>
  );
}

async function resizeImageForUpload(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const { width, height } = fitInside(image.naturalWidth, image.naturalHeight, 1200);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context is unavailable.');
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.82);
    const extension = 'jpg';

    return { blob, extension };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded.'));
    image.src = src;
  });
}

function fitInside(sourceWidth, sourceHeight, maxSize) {
  const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas compression failed.'));
        }
      },
      type,
      quality,
    );
  });
}

function createImagePath(extension) {
  const safeExtension = String(extension || 'jpg').replace(/[^a-z0-9]/g, '') || 'jpg';
  const randomId = Math.random().toString(36).slice(2, 10);
  return `covers/${Date.now()}-${randomId}.${safeExtension}`;
}

function formatShortDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

createRoot(document.getElementById('root')).render(<App />);
