# Story Bank — Kudinov Matvii

STAR+R stories for interview prep.

---

## Story 1: X-Ray Fracture Detection API (AI + Backend)

**Situation:** Wanted to build a real-world AI application during studies. Medical imaging was an under-served area with clear value.

**Task:** Build a production-ready REST API that detects bone fractures in X-ray images using a custom ML model.

**Action:**
- Trained a YOLOv8m object detection model on a bone fracture dataset
- Exported to ONNX format and ran in-process in .NET via ONNX Runtime
- Built ASP.NET Core REST API with file upload, inference, and result endpoints
- Containerized with Docker and deployed to Azure Container Apps
- Built React frontend on Vercel

**Result:** Fully deployed, publicly accessible AI-powered medical API. Demonstrates end-to-end ML integration in .NET — from model training to cloud deployment.

**Reflection:** Learned that integrating ML models into .NET backends is very achievable with ONNX Runtime, and that Azure Container Apps is an excellent low-cost way to host containerized APIs.

---

## Story 2: Hospital X-Ray Desktop System (Complex System Design)

**Situation:** Wanted to simulate a real hospital workflow where multiple roles interact with an AI diagnostic tool.

**Task:** Design and build a multi-role desktop clinical system where different users have different capabilities.

**Action:**
- Designed role-based access: nurses (patient registration), radiologists (AI inference + verification), surgeons (review + treatment plans), admin (model fine-tuning)
- Implemented WPF desktop app with per-role UI
- Integrated YOLOv8 for fracture detection
- Built continuous learning: radiologist corrections accumulate into verified dataset for controlled fine-tuning

**Result:** A full-featured desktop system that mirrors real clinical workflow, with an AI component that improves over time.

**Reflection:** Learned the importance of role-based design upfront, and how to architect systems where human feedback drives ML improvement.

---

## Story 3: Rate Limiting with SemaphoreSlim (Technical Problem Solving)

**Situation:** Crypto Portfolio Tracker needed to call the CoinGecko API for live prices, but CoinGecko has rate limits.

**Task:** Prevent API rate limit errors while still serving concurrent user requests.

**Action:**
- Researched rate limiting patterns in .NET
- Implemented SemaphoreSlim to limit concurrent outbound requests
- Added IMemoryCache to cache prices for 60 seconds per coin
- Tested concurrent load scenarios

**Result:** API handles concurrent users without hitting rate limits. Cache reduces external API calls by ~80% under load.

**Reflection:** Learned that caching + concurrency control together solve most rate limit problems, and that SemaphoreSlim is the right tool for limiting concurrent async operations.
