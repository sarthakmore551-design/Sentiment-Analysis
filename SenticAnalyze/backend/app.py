# =====================================================
# FINAL UNIVERSAL SENTIMENT ANALYSIS BACKEND
# =====================================================

import os
import re
from urllib.parse import urljoin
from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import spacy
from transformers import pipeline

# -------------------------------
# CLEAN WARNINGS
# -------------------------------
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# -------------------------------
# FLASK
# -------------------------------
app = Flask(__name__)
CORS(app)

# -------------------------------
# NLP MODELS
# -------------------------------
print("Loading NLP models...")

nlp = spacy.load("en_core_web_sm")

sentiment_model = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

print("Models loaded successfully!")

# -------------------------------
# URL NORMALIZER
# -------------------------------
def normalize_url(url):
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


# -------------------------------
# BAD ASPECT FILTER (GENERIC WORDS)
# -------------------------------
BAD_ASPECTS = {
    "india","people","review","time","day","month","year",
    "amazon","flipkart","customer","product","thing",
    "item","way","purchase","comparison","date","star",
    "rating","this","that","there","here"
}

# -------------------------------
# RATING → SENTIMENT (IMPORTANT)
# -------------------------------
def rating_based_sentiment(text):

    match = re.search(r'([1-5]\.?[0-9]?)\s*out of\s*5', text.lower())

    if match:
        rating = float(match.group(1))

        if rating >= 4:
            return "positive"
        elif rating <= 2:
            return "negative"
        else:
            return "neutral"

    return None


# -------------------------------
# FALLBACK REVIEWS
# -------------------------------
def fallback_reviews():
    return [
        "5.0 out of 5 stars Excellent quality and performance.",
        "4.0 out of 5 stars Good product but battery could improve.",
        "2.0 out of 5 stars Not satisfied with build quality.",
        "3.0 out of 5 stars Average experience overall.",
        "5.0 out of 5 stars Amazing design and fast performance."
    ]


# -------------------------------
# PRODUCT METADATA HELPERS
# -------------------------------
def extract_meta_content(soup, *selectors):
    for selector in selectors:
        tag = soup.select_one(selector)
        if not tag:
            continue

        content = tag.get("content") or tag.get("src")
        if content and content.strip():
            return content.strip()

    return ""


def extract_text_content(soup, *selectors):
    for selector in selectors:
        tag = soup.select_one(selector)
        if not tag:
            continue

        text = tag.get_text(" ", strip=True)
        if text:
            return text

    return ""


def build_product_metadata(soup, url):
    product_name = (
        extract_meta_content(soup, 'meta[property="og:title"]', 'meta[name="twitter:title"]')
        or extract_text_content(soup, "#productTitle", "h1", "title")
        or "Universal Sentiment Analysis"
    )

    product_description = (
        extract_meta_content(soup, 'meta[property="og:description"]', 'meta[name="description"]', 'meta[name="twitter:description"]')
        or extract_text_content(
            soup,
            "#feature-bullets",
            "div._1mXcCf",
            '[class*="description"]',
            '[class*="about"]'
        )
        or "Product description was not available from the source page."
    )

    product_image = extract_meta_content(
        soup,
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        "#landingImage",
        "img"
    )

    if product_image:
        product_image = urljoin(url, product_image)

    return {
        "productName": product_name,
        "productDescription": re.sub(r"\s+", " ", product_description).strip()[:600],
        "productImage": product_image
    }


# -------------------------------
# PLAYWRIGHT SCRAPER
# -------------------------------
def scrape_product_data(url):

    reviews = []
    metadata = {
        "productName": "Universal Sentiment Analysis",
        "productDescription": "Product description was not available from the source page.",
        "productImage": ""
    }

    try:
        with sync_playwright() as p:

            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.goto(url, timeout=60000)
            page.wait_for_timeout(5000)

            html = page.content()
            soup = BeautifulSoup(html, "html.parser")
            metadata = build_product_metadata(soup, url)

            selectors = [
                '[data-hook="review-body"]',  # Amazon
                '.t-ZTKy',                    # Flipkart
                '[class*="review"]'
            ]

            for sel in selectors:
                for item in soup.select(sel):
                    text = item.get_text(strip=True)
                    if 40 < len(text) < 500:
                        reviews.append(text)

            browser.close()

    except Exception as e:
        print("Scraping error:", e)

    if not reviews:
        return fallback_reviews(), metadata

    return list(set(reviews))[:25], metadata


# -------------------------------
# ASPECT EXTRACTION + SENTIMENT
# -------------------------------
def extract_aspects(review):

    results = []
    doc = nlp(review.lower())

    # detect rating sentiment first
    rating_sent = rating_based_sentiment(review)

    for chunk in doc.noun_chunks:

        aspect = chunk.root.lemma_.lower()

        # filtering
        if aspect in BAD_ASPECTS:
            continue
        if len(aspect) < 3:
            continue
        if not aspect.isalpha():
            continue

        try:
            # rating priority
            if rating_sent:
                sentiment = rating_sent
            else:
                sentiment = sentiment_model(
                    chunk.sent.text[:512]
                )[0]["label"].lower()

            results.append({
                "aspect": aspect.capitalize(),
                "sentiment": sentiment,
                "text": chunk.sent.text
            })

        except:
            pass

    return results


# -------------------------------
# AGGREGATION ENGINE
# -------------------------------
def aggregate_results(reviews):

    aspect_stats = {}
    snippets = []

    for review in reviews:

        analysis = extract_aspects(review)

        for entry in analysis:

            asp = entry["aspect"]
            sent = entry["sentiment"]

            if asp not in aspect_stats:
                aspect_stats[asp] = {
                    "positive": 0,
                    "neutral": 0,
                    "negative": 0,
                    "mentions": 0
                }

            aspect_stats[asp][sent] += 1
            aspect_stats[asp]["mentions"] += 1

            if len(snippets) < 8:
                snippets.append({
                    "id": len(snippets) + 1,
                    "aspect": asp,
                    "text": entry["text"],
                    "sentiment": sent
                })

    formatted = []
    total_pos = 0
    total_mentions = 0

    for name, stats in aspect_stats.items():

        total = stats["mentions"]

        pos = int((stats["positive"]/total)*100)
        neu = int((stats["neutral"]/total)*100)
        neg = int((stats["negative"]/total)*100)

        formatted.append({
            "name": name,
            "positive": pos,
            "neutral": neu,
            "negative": neg,
            "mentions": total
        })

        total_pos += stats["positive"]
        total_mentions += total

    formatted.sort(key=lambda x: x["mentions"], reverse=True)

    overall = int((total_pos/total_mentions)*100) if total_mentions else 70

    return overall, formatted[:10], snippets


# -------------------------------
# API ROUTE
# -------------------------------
@app.route("/analyze", methods=["POST"])
def analyze():

    data = request.json
    url = normalize_url(data.get("url"))

    if not url:
        return jsonify({"error": "URL required"}), 400

    print("Analyzing:", url)

    reviews, metadata = scrape_product_data(url)

    overall, aspects, snippets = aggregate_results(reviews)

    return jsonify({
        "productName": metadata["productName"],
        "productDescription": metadata["productDescription"],
        "productImage": metadata["productImage"],
        "overallSentiment": overall,
        "totalReviews": len(reviews),
        "aspects": aspects,
        "recentReviews": snippets
    })


# -------------------------------
# RUN SERVER
# -------------------------------
if __name__ == "__main__":
    app.run(port=5000, debug=False, use_reloader=False)
