"""
The Ownership Layer - Interactive Playground
Testing and demonstration environment for content fingerprinting
"""

import streamlit as st
import requests
import json
from PIL import Image
import io
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
ENGINE_BASE_URL = os.getenv("ENGINE_BASE_URL", "http://localhost:8001")

st.set_page_config(
    page_title="The Ownership Layer - Playground",
    page_icon="🔐",
    layout="wide"
)

def main():
    st.title("🔐 The Ownership Layer - Playground")
    st.markdown("**Interactive testing environment for content fingerprinting and attribution**")
    
    # Sidebar for navigation
    st.sidebar.title("Navigation")
    page = st.sidebar.selectbox(
        "Choose a feature to test:",
        ["Text Fingerprinting", "Image Fingerprinting", "Audio Fingerprinting", "Code Fingerprinting", "Content Matching", "API Status"]
    )
    
    if page == "Text Fingerprinting":
        text_fingerprinting_page()
    elif page == "Image Fingerprinting":
        image_fingerprinting_page()
    elif page == "Audio Fingerprinting":
        audio_fingerprinting_page()
    elif page == "Code Fingerprinting":
        code_fingerprinting_page()
    elif page == "Content Matching":
        content_matching_page()
    elif page == "API Status":
        api_status_page()

def text_fingerprinting_page():
    st.header("📝 Text Fingerprinting")
    st.markdown("Test text content fingerprinting and similarity detection")
    
    # Input text
    text_input = st.text_area(
        "Enter your text content:",
        placeholder="Write or paste your original text here...",
        height=200
    )
    
    if st.button("Generate Fingerprint", type="primary"):
        if text_input.strip():
            with st.spinner("Generating fingerprint..."):
                try:
                    response = requests.post(
                        f"{API_BASE_URL}/api/fingerprint",
                        json={
                            "content": text_input,
                            "content_type": "text",
                            "metadata": {"source": "playground"}
                        }
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.success("Fingerprint generated successfully!")
                        
                        col1, col2 = st.columns(2)
                        with col1:
                            st.subheader("Fingerprint Details")
                            st.json({
                                "fingerprint_id": result["fingerprint_id"],
                                "content_hash": result["content_hash"],
                                "similarity_threshold": result["similarity_threshold"]
                            })
                        
                        with col2:
                            st.subheader("Metadata")
                            st.json(result["metadata"])
                        
                        st.subheader("Embedding Vector")
                        st.write(f"Dimension: {len(result['embedding'])}")
                        st.bar_chart(result["embedding"][:50])  # Show first 50 dimensions
                        
                    else:
                        st.error(f"Error: {response.status_code} - {response.text}")
                        
                except requests.exceptions.ConnectionError:
                    st.error("Could not connect to API. Make sure the backend is running.")
                except Exception as e:
                    st.error(f"Error: {str(e)}")
        else:
            st.warning("Please enter some text to fingerprint.")

def image_fingerprinting_page():
    st.header("🖼️ Image Fingerprinting")
    st.markdown("Test image content fingerprinting and similarity detection")
    
    uploaded_file = st.file_uploader(
        "Upload an image:",
        type=['png', 'jpg', 'jpeg', 'gif', 'bmp']
    )
    
    if uploaded_file is not None:
        # Display the image
        image = Image.open(uploaded_file)
        st.image(image, caption="Uploaded Image", use_column_width=True)
        
        if st.button("Generate Image Fingerprint", type="primary"):
            with st.spinner("Processing image..."):
                try:
                    # Convert image to bytes for API
                    img_byte_arr = io.BytesIO()
                    image.save(img_byte_arr, format='PNG')
                    img_byte_arr = img_byte_arr.getvalue()
                    
                    files = {"file": ("image.png", img_byte_arr, "image/png")}
                    response = requests.post(f"{API_BASE_URL}/api/upload", files=files)
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.success("Image fingerprint generated!")
                        st.json(result)
                    else:
                        st.error(f"Error: {response.status_code} - {response.text}")
                        
                except Exception as e:
                    st.error(f"Error: {str(e)}")

def audio_fingerprinting_page():
    st.header("🎵 Audio Fingerprinting")
    st.markdown("Test audio content fingerprinting and similarity detection")
    
    uploaded_file = st.file_uploader(
        "Upload an audio file:",
        type=['mp3', 'wav', 'ogg', 'm4a']
    )
    
    if uploaded_file is not None:
        st.audio(uploaded_file, format='audio/wav')
        
        if st.button("Generate Audio Fingerprint", type="primary"):
            with st.spinner("Processing audio..."):
                try:
                    files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                    response = requests.post(f"{API_BASE_URL}/api/upload", files=files)
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.success("Audio fingerprint generated!")
                        st.json(result)
                    else:
                        st.error(f"Error: {response.status_code} - {response.text}")
                        
                except Exception as e:
                    st.error(f"Error: {str(e)}")

def code_fingerprinting_page():
    st.header("💻 Code Fingerprinting")
    st.markdown("Test code content fingerprinting and similarity detection")
    
    # Language selection
    language = st.selectbox(
        "Select programming language:",
        ["python", "javascript", "java", "cpp", "go", "rust"]
    )
    
    # Code input
    code_input = st.text_area(
        "Enter your code:",
        placeholder="Paste your code here...",
        height=300
    )
    
    if st.button("Generate Code Fingerprint", type="primary"):
        if code_input.strip():
            with st.spinner("Analyzing code..."):
                try:
                    response = requests.post(
                        f"{API_BASE_URL}/api/fingerprint",
                        json={
                            "content": code_input,
                            "content_type": "code",
                            "metadata": {"language": language, "source": "playground"}
                        }
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.success("Code fingerprint generated!")
                        st.json(result)
                    else:
                        st.error(f"Error: {response.status_code} - {response.text}")
                        
                except Exception as e:
                    st.error(f"Error: {str(e)}")
        else:
            st.warning("Please enter some code to fingerprint.")

def content_matching_page():
    st.header("🔍 Content Matching")
    st.markdown("Test content similarity matching and attribution")
    
    # Content type selection
    content_type = st.selectbox(
        "Content type:",
        ["text", "image", "audio", "code"]
    )
    
    if content_type == "text":
        content_input = st.text_area(
            "Enter content to search for:",
            placeholder="Enter text to find similar content...",
            height=150
        )
    else:
        st.info(f"Upload a {content_type} file to search for similar content")
        content_input = st.file_uploader(f"Upload {content_type} file:")
    
    # Similarity threshold
    threshold = st.slider("Similarity threshold:", 0.0, 1.0, 0.8, 0.05)
    
    if st.button("Find Similar Content", type="primary"):
        if content_input:
            with st.spinner("Searching for similar content..."):
                try:
                    if content_type == "text":
                        response = requests.post(
                            f"{API_BASE_URL}/api/match",
                            json={
                                "content": content_input,
                                "content_type": content_type,
                                "threshold": threshold
                            }
                        )
                    else:
                        # Handle file uploads for other content types
                        st.info("File upload matching coming soon!")
                        return
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.success("Search completed!")
                        
                        if result["matches"]:
                            st.subheader("Similar Content Found:")
                            for i, (match, score) in enumerate(zip(result["matches"], result["similarity_scores"])):
                                with st.expander(f"Match {i+1} - Similarity: {score:.2%}"):
                                    st.json(match)
                        else:
                            st.info("No similar content found above the threshold.")
                    else:
                        st.error(f"Error: {response.status_code} - {response.text}")
                        
                except Exception as e:
                    st.error(f"Error: {str(e)}")

def api_status_page():
    st.header("🔧 API Status")
    st.markdown("Check the status of all backend services")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Main API")
        try:
            response = requests.get(f"{API_BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                st.success("✅ API is running")
                st.json(response.json())
            else:
                st.error(f"❌ API error: {response.status_code}")
        except:
            st.error("❌ API is not accessible")
    
    with col2:
        st.subheader("AI Engine")
        try:
            response = requests.get(f"{ENGINE_BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                st.success("✅ Engine is running")
                st.json(response.json())
            else:
                st.error(f"❌ Engine error: {response.status_code}")
        except:
            st.error("❌ Engine is not accessible")
    
    # Environment info
    st.subheader("Environment Configuration")
    st.json({
        "API_BASE_URL": API_BASE_URL,
        "ENGINE_BASE_URL": ENGINE_BASE_URL,
        "OPENAI_API_KEY": "Set" if os.getenv("OPENAI_API_KEY") else "Not set"
    })

if __name__ == "__main__":
    main()
