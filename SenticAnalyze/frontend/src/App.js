import React, { useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  PieChart,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp
} from 'lucide-react';

const navItems = [
  { id: 'analyzer', label: 'Analyzer' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'case-studies', label: 'Case Studies' },
  { id: 'docs', label: 'Docs' }
];

const howItWorksSteps = [
  {
    title: 'Collect Reviews',
    description: 'Paste a product URL and SenticAnalyze gathers review text from supported commerce pages.'
  },
  {
    title: 'Detect Product Aspects',
    description: 'The NLP pipeline extracts feature-level topics like battery, design, display, and delivery.'
  },
  {
    title: 'Score Sentiment',
    description: 'Each review sentence is classified so the dashboard can show positive, neutral, and negative mix by aspect.'
  },
  {
    title: 'Share Findings',
    description: 'Export a concise report once analysis is complete and use it in project reviews, demos, or product discussions.'
  }
];

const docsSections = [
  {
    title: 'Supported inputs',
    body: 'Provide a direct Amazon or Flipkart product URL. If a protocol is missing, the backend automatically normalizes it.'
  },
  {
    title: 'Returned metrics',
    body: 'The dashboard includes overall sentiment, total reviews scraped, top aspects, and sample review snippets grouped by sentiment.'
  },
  {
    title: 'Report export',
    body: 'Use Export Report after a successful analysis to download a text summary containing the source URL, sentiment score, aspects, and snippets.'
  }
];

const caseStudies = [
  {
    title: 'Electronics launch review',
    summary: 'Compare first-wave customer feedback for battery, display, and performance before the second stock run.',
    outcome: 'Teams can quickly identify if praise is concentrated on design while support issues cluster around delivery or charging.'
  },
  {
    title: 'Marketplace competitor scan',
    summary: 'Run similar products through the analyzer to spot where competing listings win or lose on customer perception.',
    outcome: 'This makes it easier to frame positioning around the features customers actually mention most.'
  },
  {
    title: 'Academic project demo',
    summary: 'Use exported reports as a clean artifact for presentations, viva reviews, or stakeholder walkthroughs.',
    outcome: 'The same analysis screen doubles as a polished explanation of the NLP workflow and its output.'
  }
];

const EmptyState = () => (
  <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
    <div className="text-center">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 inline-block">
        <MessageSquare className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="font-bold text-lg mb-2">Automated Scraping</h3>
      <p className="text-sm text-gray-500">Fetches hundreds of reviews in seconds using advanced web crawler logic.</p>
    </div>
    <div className="text-center">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 inline-block">
        <Search className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="font-bold text-lg mb-2">Feature Detection</h3>
      <p className="text-sm text-gray-500">ML-powered extraction identifies specific features like battery, price, or build.</p>
    </div>
    <div className="text-center">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-4 inline-block">
        <ThumbsUp className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="font-bold text-lg mb-2">Granular Sentiment</h3>
      <p className="text-sm text-gray-500">Goes beyond simple stars to reveal how customers feel about every single detail.</p>
    </div>
  </div>
);

const InfoPage = ({ eyebrow, title, description, children }) => (
  <section className="space-y-8">
    <div className="max-w-3xl">
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold mb-4">
        <Sparkles size={14} />
        {eyebrow}
      </span>
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{title}</h1>
      <p className="text-lg text-gray-600">{description}</p>
    </div>
    {children}
  </section>
);

const getSafeFileName = (value) => (
  (value || 'sentic-analyze-report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'sentic-analyze-report'
);

const loadImageAsDataUrl = async (imageUrl) => {
  if (!imageUrl) {
    return null;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error('Unable to fetch product image for the report.');
  }

  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to process product image for the report.'));
    reader.readAsDataURL(blob);
  });
};

const App = () => {
  const [activePage, setActivePage] = useState('analyzer');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [exportMessage, setExportMessage] = useState('');
  const [exporting, setExporting] = useState(false);

  const stages = [
    'Initializing web scraper...',
    'Extracting product reviews...',
    'Cleaning and preprocessing text data...',
    'Running NLP: Aspect Extraction...',
    'Running NLP: Sentiment Classification...',
    'Finalizing dashboard view...'
  ];

  const exportReport = async () => {
    if (!results) {
      setExportMessage('Run an analysis before exporting a report.');
      return;
    }

    const jsPdfNamespace = window.jspdf;
    if (!jsPdfNamespace?.jsPDF) {
      setExportMessage('PDF exporter is not available right now.');
      return;
    }

    setExporting(true);
    setExportMessage('');

    try {
      const { jsPDF } = jsPdfNamespace;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);
      let y = 56;

      const addWrappedText = (text, x, startY, options = {}) => {
        const {
          maxWidth = contentWidth,
          lineHeight = 16,
          fontSize = 11,
          color = [75, 85, 99],
          style = 'normal'
        } = options;

        doc.setFont('helvetica', style);
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);

        const lines = doc.splitTextToSize(text || '', maxWidth);
        lines.forEach((line) => {
          if (startY > pageHeight - 50) {
            doc.addPage();
            startY = 50;
          }
          doc.text(line, x, startY);
          startY += lineHeight;
        });

        return startY;
      };

      doc.setFillColor(79, 70, 229);
      doc.roundedRect(margin, y - 20, contentWidth, 96, 16, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('SenticAnalyze Report', margin + 22, y + 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Generated on ${new Date().toLocaleString()}`, margin + 22, y + 34);
      doc.text(`Source URL: ${url || 'Not provided'}`, margin + 22, y + 52, { maxWidth: contentWidth - 44 });
      y += 110;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(17, 24, 39);
      doc.text(results.productName || 'Universal Sentiment Analysis', margin, y);
      y += 18;

      y = addWrappedText(
        results.productDescription || 'Product description was not available from the source page.',
        margin,
        y + 12,
        { fontSize: 11, lineHeight: 15 }
      );

      try {
        const imageData = await loadImageAsDataUrl(results.productImage);
        if (imageData) {
          const imageType = imageData.includes('image/png') ? 'PNG' : 'JPEG';
          const imageWidth = 140;
          const imageHeight = 140;
          const imageY = Math.max(90, y - 90);
          doc.addImage(imageData, imageType, pageWidth - margin - imageWidth, imageY, imageWidth, imageHeight, undefined, 'FAST');
          y = Math.max(y, imageY + imageHeight + 10);
        }
      } catch (imageError) {
        console.error(imageError);
      }

      y += 12;
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, pageWidth - margin, y);
      y += 26;

      const summaryCards = [
        { label: 'Overall Sentiment', value: `${results.overallSentiment}%` },
        { label: 'Total Reviews', value: `${results.totalReviews}` },
        { label: 'Top Aspect', value: results.aspects[0]?.name || 'N/A' }
      ];

      summaryCards.forEach((card, index) => {
        const cardWidth = (contentWidth - 20) / 3;
        const x = margin + (index * (cardWidth + 10));
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardWidth, 64, 12, 12, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(card.label, x + 14, y + 22);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39);
        doc.text(card.value, x + 14, y + 46);
      });

      y += 92;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(17, 24, 39);
      doc.text('Top Aspect Breakdown', margin, y);
      y += 18;

      const aspectRows = results.aspects.length
        ? results.aspects
        : [{ name: 'No aspect data', mentions: 0, positive: 0, neutral: 0, negative: 0 }];

      aspectRows.forEach((aspect, index) => {
        if (y > pageHeight - 110) {
          doc.addPage();
          y = 50;
        }

        doc.setFillColor(index % 2 === 0 ? 255 : 249, 250, 251);
        doc.roundedRect(margin, y, contentWidth, 48, 10, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(aspect.name, margin + 14, y + 19);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99);
        doc.text(
          `Mentions: ${aspect.mentions} | Positive: ${aspect.positive}% | Neutral: ${aspect.neutral}% | Negative: ${aspect.negative}%`,
          margin + 14,
          y + 36
        );
        y += 58;
      });

      y += 8;
      if (y > pageHeight - 120) {
        doc.addPage();
        y = 50;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(17, 24, 39);
      doc.text('Key Feedback Snippets', margin, y);
      y += 20;

      const reviewRows = results.recentReviews.length
        ? results.recentReviews
        : [{ aspect: 'General', sentiment: 'neutral', text: 'No review snippets available.' }];

      reviewRows.forEach((review, index) => {
        if (y > pageHeight - 90) {
          doc.addPage();
          y = 50;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(79, 70, 229);
        doc.text(`${index + 1}. ${review.aspect} (${review.sentiment})`, margin, y);
        y = addWrappedText(review.text, margin, y + 16, {
          fontSize: 10,
          lineHeight: 14,
          color: [75, 85, 99]
        });
        y += 8;
      });

      doc.save(`${getSafeFileName(results.productName)}.pdf`);
      setExportMessage('PDF report exported successfully.');
    } catch (exportError) {
      console.error(exportError);
      setExportMessage('Unable to generate the PDF report.');
    } finally {
      setExporting(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url) {
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setExportMessage('');
    setLoadingStage(0);

    const interval = setInterval(() => {
      setLoadingStage((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1200);

    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error occurred');
      }

      const data = await response.json();
      setResults(data);
      setActivePage('analyzer');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to connect to the analysis engine. Ensure backend is running.');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  let content = null;

  if (activePage === 'how-it-works') {
    content = (
      <InfoPage
        eyebrow="Workflow"
        title="How SenticAnalyze turns raw reviews into feature-level insights"
        description="The experience stays simple on the surface, but the analysis pipeline still exposes the steps behind scraping, extraction, classification, and reporting."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {howItWorksSteps.map((step, index) => (
            <div key={step.title} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center mb-4">
                0{index + 1}
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </InfoPage>
    );
  } else if (activePage === 'docs') {
    content = (
      <InfoPage
        eyebrow="Documentation"
        title="Quick reference for using the analyzer"
        description="These notes match the current implementation so anyone opening the project can understand inputs, outputs, and the export flow without leaving the app."
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {docsSections.map((section) => (
            <div key={section.title} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">{section.title}</h3>
              <p className="text-sm text-gray-600 leading-6">{section.body}</p>
            </div>
          ))}
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-lg text-gray-900 mb-3">API endpoint</h3>
          <div className="bg-gray-900 text-gray-100 rounded-xl p-4 text-sm overflow-x-auto">
            <code>{`POST http://localhost:5000/analyze\nContent-Type: application/json\n\n{ "url": "https://example.com/product-page" }`}</code>
          </div>
        </div>
      </InfoPage>
    );
  } else if (activePage === 'case-studies') {
    content = (
      <InfoPage
        eyebrow="Use Cases"
        title="Case studies that fit the current product story"
        description="These scenarios keep the academic and product-analysis positioning intact while showing where the dashboard and export report add real value."
      >
        <div className="space-y-6">
          {caseStudies.map((study) => (
            <div key={study.title} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">{study.title}</h3>
                  <p className="text-gray-600 mb-3">{study.summary}</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-600 text-sm font-semibold h-fit">
                  <CheckCircle2 size={14} />
                  Practical outcome
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-6">{study.outcome}</p>
            </div>
          ))}
        </div>
      </InfoPage>
    );
  } else {
    content = (
      <>
        <section className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Unlock Deep <span className="text-indigo-600">Product Insights</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Paste an e-commerce URL to dissect customer reviews by feature and sentiment.
          </p>

          <form onSubmit={handleAnalyze} className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition"
                placeholder="Paste Amazon or Flipkart product URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`px-8 py-4 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'}`}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Analyze Now'}
            </button>
          </form>
          {error && (
            <p className="text-red-500 mt-4 text-sm flex items-center justify-center gap-1">
              <AlertCircle size={16} />
              {error}
            </p>
          )}
        </section>

        {loading && (
          <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
            <div className="mb-6 relative">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
            </div>
            <h3 className="text-xl font-bold mb-2">Analyzing Product Data</h3>
            <p className="text-gray-500 mb-6 italic">This may take up to a minute for large datasets.</p>

            <div className="space-y-3 text-left">
              {stages.map((stage, idx) => (
                <div key={stage} className="flex items-center gap-3">
                  {loadingStage > idx ? (
                    <CheckCircle2 className="text-green-500 w-5 h-5" />
                  ) : loadingStage === idx ? (
                    <Loader2 className="text-indigo-600 w-5 h-5 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-gray-200"></div>
                  )}
                  <span className={`text-sm ${loadingStage === idx ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
                    {stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex gap-4 items-start">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                    {results.productImage ? (
                      <img
                        src={results.productImage}
                        alt={results.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BarChart3 className="w-8 h-8 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 mb-2">Analyzed Product</p>
                    <h2 className="text-2xl font-bold text-gray-900">{results.productName}</h2>
                    <p className="text-sm text-gray-500 mt-2 max-w-3xl">
                      {results.productDescription || 'Product description was not available from the source page.'}
                    </p>
                    <p className="text-sm text-gray-400 mt-3 break-all">Source: {url}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start lg:items-end gap-2">
                  <button
                    type="button"
                    onClick={exportReport}
                    disabled={exporting}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition ${
                      exporting
                        ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {exporting ? 'Generating PDF...' : 'Export Report'}
                  </button>
                  {exportMessage && <span className="text-xs text-green-600">{exportMessage}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-indigo-50 rounded-lg"><TrendingUp className="text-indigo-600" /></div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+4.2% Growth</span>
                </div>
                <h4 className="text-gray-500 text-sm font-medium">Overall Sentiment</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{results.overallSentiment}%</span>
                  <span className="text-gray-400 text-sm">Positive score</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg"><MessageSquare className="text-blue-600" /></div>
                </div>
                <h4 className="text-gray-500 text-sm font-medium">Total Reviews Scraped</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{results.totalReviews.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm">Verified sources</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-amber-50 rounded-lg"><PieChart className="text-amber-600" /></div>
                </div>
                <h4 className="text-gray-500 text-sm font-medium">Top Aspect</h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold truncate max-w-[150px]">{results.aspects[0]?.name || 'N/A'}</span>
                  <span className="text-gray-400 text-sm">{results.aspects[0]?.positive || 0}% score</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg">Feature Sentiment Breakdown</h3>
                    <p className="text-sm text-gray-500 mt-1">Source: {url}</p>
                  </div>
                  <span className="text-sm font-medium text-indigo-600">PDF report ready from current results</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Product Feature</th>
                        <th className="px-6 py-4">Mentions</th>
                        <th className="px-6 py-4">Sentiment Mix</th>
                        <th className="px-6 py-4">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {results.aspects.map((aspect, idx) => (
                        <tr key={`${aspect.name}-${idx}`} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 font-semibold text-gray-700">{aspect.name}</td>
                          <td className="px-6 py-4 text-gray-500 text-sm">{aspect.mentions}</td>
                          <td className="px-6 py-4 min-w-[150px]">
                            <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-100">
                              <div style={{ width: `${aspect.positive}%` }} className="bg-green-500"></div>
                              <div style={{ width: `${aspect.neutral}%` }} className="bg-gray-300"></div>
                              <div style={{ width: `${aspect.negative}%` }} className="bg-red-500"></div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-sm font-bold ${aspect.positive > 70 ? 'text-green-600' : aspect.positive > 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {aspect.positive}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="font-bold text-lg">Key Feedback Snippets</h3>
                </div>
                <div className="p-6 flex-grow space-y-4">
                  {results.recentReviews.map((review) => (
                    <div key={review.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 group hover:border-indigo-200 transition">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                          {review.aspect}
                        </span>
                        {review.sentiment === 'positive' ? (
                          <ThumbsUp size={14} className="text-green-500" />
                        ) : review.sentiment === 'negative' ? (
                          <ThumbsDown size={14} className="text-red-500" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-gray-300" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 italic">"{review.text}"</p>
                    </div>
                  ))}

                  <button type="button" className="w-full py-3 mt-4 text-sm font-bold text-gray-500 hover:text-indigo-600 flex items-center justify-center gap-1 transition">
                    Load More Reviews <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!results && !loading && <EmptyState />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:justify-between md:h-16 md:items-center py-4 md:py-0 gap-4">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <BarChart3 className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-800">Sentic<span className="text-indigo-600">Analyze</span></span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              {navItems.map((item) => {
                const isActive = activePage === item.id;
                const baseClass = 'transition px-4 py-2 rounded-full';
                const activeClass = isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-500 hover:text-indigo-600';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePage(item.id)}
                    className={`${baseClass} ${activeClass}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {content}
      </main>

      <footer className="bg-white border-t border-gray-200 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-3">
            <FileText size={16} />
            Built for product sentiment analysis, project demos, and reusable reporting.
          </div>
          <p className="text-gray-400 text-sm">© 2025 SenticAnalyze Engine. Final Year B.E. Project.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
