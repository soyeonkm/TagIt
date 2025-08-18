import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tauriSupabase } from '../tauriClient'
import { useAuth } from '../contexts/AuthContext'

function Project() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [photos, setPhotos] = useState([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [metadataPanelOpen, setMetadataPanelOpen] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState(null) // Track edited metadata
  const [hasMetadataChanges, setHasMetadataChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '', xmpPath: '' })
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  
  // Add/remove body class when metadata panel opens/closes
  useEffect(() => {
    console.log('Metadata panel state changed:', metadataPanelOpen)
    if (metadataPanelOpen) {
      document.body.classList.add('panel-open')
      console.log('Added panel-open class to body')
      console.log('Body classes:', document.body.className)
      
      // Check if the photo grid exists and log its current styles
      setTimeout(() => {
        const photoGrid = document.querySelector('.photo-grid')
        if (photoGrid) {
          const computedStyle = window.getComputedStyle(photoGrid)
          console.log('Photo grid computed styles:', {
            marginRight: computedStyle.marginRight,
            width: computedStyle.width,
            maxWidth: computedStyle.maxWidth
          })
        }
      }, 100)
    } else {
      document.body.classList.remove('panel-open')
      console.log('Removed panel-open class from body')
      console.log('Body classes:', document.body.className)
    }
    
    // Cleanup function to remove class when component unmounts
    return () => {
      document.body.classList.remove('panel-open')
      console.log('Cleanup: removed panel-open class from body')
    }
  }, [metadataPanelOpen])
  
  // Lazy loading states
  const [allPhotos, setAllPhotos] = useState([]) // All photos from folder
  const [visiblePhotos, setVisiblePhotos] = useState([]) // Currently visible photos
  const [loadedChunks, setLoadedChunks] = useState(new Set()) // Track loaded chunks
  const [currentChunk, setCurrentChunk] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Image thumbnail cache
  const [thumbnailCache, setThumbnailCache] = useState(new Map())
  const [loadingThumbnails, setLoadingThumbnails] = useState(new Set())
  
  // Refs for intersection observer
  const photoGridRef = useRef(null)
  const sentinelRef = useRef(null)
  
  const { user, isDevelopment, getMockProject, accessToken } = useAuth()

  // Constants for chunking
  const PHOTOS_PER_CHUNK = 5
  const PRELOAD_CHUNKS = 2 // Preload next 2 chunks

  // Load and cache image thumbnail
  const loadThumbnail = useCallback(async (photo) => {
    if (thumbnailCache.has(photo.id) || loadingThumbnails.has(photo.id)) {
      return
    }

    setLoadingThumbnails(prev => new Set([...prev, photo.id]))

    try {
      if (isDevelopment) {
        // For development, create a mock thumbnail
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = 200
        canvas.height = 150
        
        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 200, 150)
        gradient.addColorStop(0, '#667eea')
        gradient.addColorStop(1, '#764ba2')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 200, 150)
        
        // Add text
        ctx.fillStyle = 'white'
        ctx.font = 'bold 16px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(photo.name.split('.')[0], 100, 80)
        ctx.font = '12px Arial'
        ctx.fillText(photo.size, 100, 100)
        
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)
        
        setThumbnailCache(prev => new Map(prev).set(photo.id, thumbnailUrl))
      } else {
        // For production, load actual image thumbnail
        const { invoke } = await import('@tauri-apps/api/core')
        
        try {
          const thumbnailData = await invoke('get_image_thumbnail', {
            filePath: photo.path,
            width: 200,
            height: 150,
            quality: 80
          })
          
          if (thumbnailData) {
            setThumbnailCache(prev => new Map(prev).set(photo.id, thumbnailData))
          }
        } catch (error) {
          console.warn(`Failed to load thumbnail for ${photo.name}:`, error)
          // Fallback to placeholder
          const fallbackUrl = createFallbackThumbnail(photo)
          setThumbnailCache(prev => new Map(prev).set(photo.id, fallbackUrl))
        }
      }
    } catch (error) {
      console.error(`Error loading thumbnail for ${photo.name}:`, error)
      // Fallback to placeholder
      const fallbackUrl = createFallbackThumbnail(photo)
      setThumbnailCache(prev => new Map(prev).set(photo.id, fallbackUrl))
    } finally {
      setLoadingThumbnails(prev => {
        const newSet = new Set(prev)
        newSet.delete(photo.id)
        return newSet
      })
    }
  }, [isDevelopment, thumbnailCache, loadingThumbnails])

  // Create fallback thumbnail
  const createFallbackThumbnail = useCallback((photo) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 200
    canvas.height = 150
    
    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 200, 150)
    gradient.addColorStop(0, '#e5e7eb')
    gradient.addColorStop(1, '#d1d5db')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 200, 150)
    
    // Add camera icon
    ctx.fillStyle = '#9ca3af'
    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('📷', 100, 70)
    
    // Add filename
    ctx.fillStyle = '#6b7280'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(photo.name.split('.')[0].substring(0, 15), 100, 100)
    
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [])

  useEffect(() => {
    if (id) {
      fetchProject()
    } else {
      setLoading(false)
    }
  }, [id])

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoadingMore && allPhotos.length > 0) {
            loadNextChunk()
          }
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [allPhotos, isLoadingMore])

  // Load next chunk of photos
  const loadNextChunk = useCallback(async () => {
    if (isLoadingMore || currentChunk * PHOTOS_PER_CHUNK >= allPhotos.length) return

    setIsLoadingMore(true)
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const startIndex = currentChunk * PHOTOS_PER_CHUNK
    const endIndex = Math.min(startIndex + PHOTOS_PER_CHUNK, allPhotos.length)
    
    const newPhotos = allPhotos.slice(startIndex, endIndex)
    
    // Update visible photos with new chunk
    setVisiblePhotos(prev => [...prev, ...newPhotos])
    setLoadedChunks(prev => new Set([...prev, currentChunk]))
    setCurrentChunk(prev => prev + 1)
    
    // Load thumbnails for new photos
    newPhotos.forEach(photo => {
      if (!thumbnailCache.has(photo.id)) {
        loadThumbnail(photo)
      }
    })
    
    // Preload thumbnails for next chunk (if available)
    const nextChunkStart = (currentChunk + 1) * PHOTOS_PER_CHUNK
    const nextChunkEnd = Math.min(nextChunkStart + PHOTOS_PER_CHUNK, allPhotos.length)
    if (nextChunkStart < allPhotos.length) {
      const nextChunkPhotos = allPhotos.slice(nextChunkStart, nextChunkEnd)
      nextChunkPhotos.forEach(photo => {
        if (!thumbnailCache.has(photo.id) && !loadingThumbnails.has(photo.id)) {
          // Preload in background without blocking UI
          setTimeout(() => loadThumbnail(photo), 100)
        }
      })
    }
    
    // Add a small delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 100))
    setIsLoadingMore(false)
  }, [currentChunk, allPhotos, isLoadingMore, visiblePhotos.length, thumbnailCache, loadThumbnail, loadingThumbnails])

  // Reset photo loading when project changes
  useEffect(() => {
    if (project && project.folder_path) {
      setVisiblePhotos([])
      setLoadedChunks(new Set())
      setCurrentChunk(0)
    }
  }, [project?.folder_path])

  const fetchProject = async () => {
    console.log('🔄 fetchProject called with id:', id)
    console.log('🔄 isDevelopment:', isDevelopment)
    console.log('🔄 user:', user)
    
    try {
      if (isDevelopment) {
        console.log('🔄 Using development mode')
        // Use mock data in development mode
        if (!user) {
          console.log('❌ No user found in development mode')
          setError('User not authenticated')
          setLoading(false)
          return
        }

        console.log('🔄 Getting mock project for id:', id)
        const { data, error } = await getMockProject(id)
        console.log('🔄 Mock project result:', { data, error })
        
        if (error) {
          console.log('❌ Mock project error:', error)
          setError('Project not found')
        } else {
          console.log('✅ Mock project loaded:', data)
          setProject(data)
          
          // Load photos after setting project
          if (data && data.folder_path) {
            console.log('🔄 Loading photos from folder:', data.folder_path)
            loadPhotosFromFolder(data);
          } else {
            console.log('⚠️ No folder_path in mock project')
          }
        }
      } else {
        console.log('🔄 Using production mode')
        // Use Tauri backend
        try {
          // Use the Tauri invoke command directly instead of tauriSupabase
          const { invoke } = await import('@tauri-apps/api/core');
          console.log('🔄 Invoking get_project_by_id with:', { projectId: id, userId: user.id })
          const projectData = await invoke('get_project_by_id', { 
            projectId: id, 
            userId: user.id, 
            accessToken: accessToken
          });
          
          console.log('🔄 Backend project data:', projectData)
          
          if (projectData) {
            setProject(projectData);
            
            // Load photos after setting project
            if (projectData && projectData.folder_path) {
              console.log('🔄 Loading photos from folder:', projectData.folder_path)
              loadPhotosFromFolder(projectData);
            } else {
              console.log('⚠️ No folder_path found, photos will not be loaded automatically');
            }
          } else {
            console.log('❌ No project data returned from backend')
            setError('Project not found');
          }
        } catch (invokeError) {
          console.error('❌ Tauri invoke error:', invokeError);
          setError('Failed to load project from backend');
        }
      }
    } catch (error) {
      console.error('❌ General error in fetchProject:', error)
      setError('Failed to load project')
    } finally {
      console.log('🔄 Setting loading to false')
      setLoading(false)
    }
  }

  const loadPhotosFromFolder = async (projectData = null) => {
    const targetProject = projectData || project;
    
    if (!targetProject) {
      return;
    }
    
    if (!targetProject.folder_path) {
      setPhotos([]);
      setAllPhotos([]);
      setVisiblePhotos([]);
      setPhotosLoading(false);
      return;
    }
    
    setPhotosLoading(true);
    
    try {
      if (isDevelopment) {
        // Mock photos for development mode
        const mockPhotos = [
          {
            id: 1,
            name: 'photo1.jpg',
            path: targetProject.folder_path + '/photo1.jpg',
            size: '2.3 MB',
            dimensions: '1920x1080',
            dateModified: new Date().toISOString(),
            type: 'image/jpeg'
          },
          {
            id: 2,
            name: 'photo2.png',
            path: targetProject.folder_path + '/photo2.png',
            size: '1.8 MB',
            dimensions: '2560x1440',
            dateModified: new Date(Date.now() - 86400000).toISOString(),
            type: 'image/png'
          },
          {
            id: 3,
            name: 'photo3.jpg',
            path: targetProject.folder_path + '/photo3.jpg',
            size: '3.1 MB',
            dimensions: '3840x2160',
            dateModified: new Date(Date.now() - 172800000).toISOString(),
            type: 'image/jpeg'
          }
        ];
        
        // For development, create more mock photos to test chunking
        const extendedMockPhotos = [...mockPhotos];
        for (let i = 4; i <= 50; i++) {
          extendedMockPhotos.push({
            id: i,
            name: `photo${i}.jpg`,
            path: targetProject.folder_path + `/photo${i}.jpg`,
            size: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
            dimensions: `${1920 + Math.floor(Math.random() * 1000)}x${1080 + Math.floor(Math.random() * 500)}`,
            dateModified: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
            type: 'image/jpeg'
          });
        }
        
        setAllPhotos(extendedMockPhotos);
        setPhotos(extendedMockPhotos);
        
        // Load first chunk
        const firstChunk = extendedMockPhotos.slice(0, PHOTOS_PER_CHUNK);
        setVisiblePhotos(firstChunk);
        setLoadedChunks(new Set([0]));
        setCurrentChunk(1);
        
        // Load thumbnails for first chunk
        firstChunk.forEach(photo => {
          loadThumbnail(photo);
        });
        
        console.log('Mock photos loaded:', extendedMockPhotos.length);
        return extendedMockPhotos;
      } else {
        // Use Tauri backend to read folder contents
        const { invoke } = await import('@tauri-apps/api/core');
        
        console.log('🔄 Loading photos from folder:', targetProject.folder_path);
        const folderPhotos = await invoke('read_project_folder', { 
          projectId: targetProject.id,
          folderPath: targetProject.folder_path,
          accessToken: accessToken
        });
        
        console.log('📸 Backend returned photos:', folderPhotos);
        console.log('📊 Photo count from backend:', folderPhotos ? folderPhotos.length : 0);
        
        // Convert the backend data format to match frontend expectations
        const processedPhotos = folderPhotos.map(photo => ({
          ...photo,
          dateModified: new Date(photo.dateModified * 1000).toISOString(), // Convert Unix timestamp to ISO string
          dimensions: photo.dimensions || 'Unknown' // Ensure dimensions field exists
        }));
        
        console.log('✅ Processed photos:', processedPhotos);
        console.log('📊 Final photo count:', processedPhotos.length);
        
        setAllPhotos(processedPhotos || []);
        setPhotos(processedPhotos || []);
        
        // Load first chunk
        const firstChunk = (processedPhotos || []).slice(0, PHOTOS_PER_CHUNK);
        setVisiblePhotos(firstChunk);
        setLoadedChunks(new Set([0]));
        setCurrentChunk(1);
        
        // Load thumbnails for first chunk
        firstChunk.forEach(photo => {
          loadThumbnail(photo);
        });
        
        // Return the processed photos for external use
        return processedPhotos || [];
      }
    } catch (error) {
      console.error('❌ Error loading photos:', error);
      setPhotos([]);
      setAllPhotos([]);
      setVisiblePhotos([]);
      return []; // Return empty array on error
    } finally {
      setPhotosLoading(false);
    }
  }

  // Function to load data URLs for local images
  const loadImageDataUrls = async (photoList) => {
    if (isDevelopment) return; // Skip for development mode
    
    const { invoke } = await import('@tauri-apps/api/core');
    const newDataUrls = {};
    
    for (const photo of photoList) {
      try {
        const dataUrl = await invoke('get_image_data_url', { 
          filePath: photo.path 
        });
        newDataUrls[photo.id] = dataUrl;
      } catch (error) {
        console.error(`Failed to load image data URL for ${photo.name}:`, error);
        // Keep the placeholder for failed images
      }
    }
    
    // setPhotoDataUrls(prev => ({ ...prev, ...newDataUrls })); // This state is no longer needed
  }

  const handlePhotoClick = async (photo) => {
    setSelectedPhoto(photo);
    setMetadataPanelOpen(true);
    setHasMetadataChanges(false);
    setSaveStatus({ type: '', message: '', xmpPath: '' });
    setLoadingMetadata(true);
    
    try {
      // Load existing XMP metadata for this photo
      const { invoke } = await import('@tauri-apps/api/core');
      
      const result = await invoke('read_photo_metadata', {
        filePath: photo.path
      });
      
      if (result.success) {
        if (result.hasMetadata) {
          // Use existing metadata
          const existingMetadata = result.metadata;
          setEditingPhoto({
            ...photo,
            xmpTitle: existingMetadata.title || '',
            xmpDescription: existingMetadata.description || '',
            xmpKeywords: existingMetadata.keywords || '',
            xmpCreator: existingMetadata.creator || '',
            xmpCopyright: existingMetadata.copyright || '',
            xmpRating: existingMetadata.rating || 0,
            xmpColorLabel: existingMetadata.colorLabel || 'None'
          });
        } else {
          // No existing metadata, start with empty fields
          setEditingPhoto({
            ...photo,
            xmpTitle: '',
            xmpDescription: '',
            xmpKeywords: '',
            xmpCreator: '',
            xmpCopyright: '',
            xmpRating: 0,
            xmpColorLabel: 'None'
          });
        }
      } else {
        // Fallback to empty fields if there's an error
        setEditingPhoto({
          ...photo,
          xmpTitle: '',
          xmpDescription: '',
          xmpKeywords: '',
          xmpCreator: '',
          xmpCopyright: '',
          xmpRating: 0,
          xmpColorLabel: 'None'
        });
      }
    } catch (error) {
      console.error('Failed to load existing metadata:', error);
      // Fallback to empty fields
      setEditingPhoto({
        ...photo,
        xmpTitle: '',
        xmpDescription: '',
        xmpKeywords: '',
        xmpCreator: '',
        xmpCopyright: '',
        xmpRating: 0,
        xmpColorLabel: 'None'
      });
    } finally {
      setLoadingMetadata(false);
    }
  }

  const handleMetadataChange = (field, value) => {
    if (!editingPhoto) return;
    
    setEditingPhoto(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Check if there are any changes
    const hasChanges = Object.keys(editingPhoto).some(key => 
      editingPhoto[key] !== selectedPhoto[key]
    );
    setHasMetadataChanges(hasChanges);
  };

  const handleSaveMetadata = async () => {
    if (!editingPhoto || !selectedPhoto) return;
    
    try {
      // Call backend to save XMP metadata
      const { invoke } = await import('@tauri-apps/api/core');
      
      const result = await invoke('update_photo_metadata', {
        filePath: selectedPhoto.path,
        metadata: {
          title: editingPhoto.xmpTitle,
          description: editingPhoto.xmpDescription,
          keywords: editingPhoto.xmpKeywords,
          creator: editingPhoto.xmpCreator,
          copyright: editingPhoto.xmpCopyright,
          rating: editingPhoto.xmpRating,
          colorLabel: editingPhoto.xmpColorLabel
        }
      });
      
      if (result.success) {
        // Update the selected photo with new metadata
        setSelectedPhoto(editingPhoto);
        setHasMetadataChanges(false);
        
        // Show success message with XMP file path
        console.log('XMP metadata file created successfully');
        console.log('XMP file path:', result.xmpPath);
        
        // Set success status
        setSaveStatus({
          type: 'success',
          message: 'Metadata saved successfully!',
          xmpPath: result.xmpPath
        });
        
        // Clear status after 5 seconds
        setTimeout(() => setSaveStatus({ type: '', message: '', xmpPath: '' }), 5000);
      }
    } catch (error) {
      console.error('Failed to save metadata:', error);
      // Show error message to user
      setSaveStatus({
        type: 'error',
        message: `Failed to save metadata: ${error.message || error}`,
        xmpPath: ''
      });
      
      // Clear status after 5 seconds
      setTimeout(() => setSaveStatus({ type: '', message: '', xmpPath: '' }), 5000);
    }
  };

  const handleResetMetadata = async () => {
    if (!selectedPhoto) return;
    
    try {
      // Reload the original metadata from XMP file
      const { invoke } = await import('@tauri-apps/api/core');
      
      const result = await invoke('read_photo_metadata', {
        filePath: selectedPhoto.path
      });
      
      if (result.success && result.hasMetadata) {
        // Use existing metadata
        const existingMetadata = result.metadata;
        setEditingPhoto({
          ...selectedPhoto,
          xmpTitle: existingMetadata.title || '',
          xmpDescription: existingMetadata.description || '',
          xmpKeywords: existingMetadata.keywords || '',
          xmpCreator: existingMetadata.creator || '',
          xmpCopyright: existingMetadata.copyright || '',
          xmpRating: existingMetadata.rating || 0,
          xmpColorLabel: existingMetadata.colorLabel || 'None'
        });
      } else {
        // No existing metadata, reset to empty fields
        setEditingPhoto({
          ...selectedPhoto,
          xmpTitle: '',
          xmpDescription: '',
          xmpKeywords: '',
          xmpCreator: '',
          xmpCopyright: '',
          xmpRating: 0,
          xmpColorLabel: 'None'
        });
      }
      
      setHasMetadataChanges(false);
      setSaveStatus({ type: '', message: '', xmpPath: '' });
    } catch (error) {
      console.error('Failed to reset metadata:', error);
      // Fallback to empty fields
      setEditingPhoto({
        ...selectedPhoto,
        xmpTitle: '',
        xmpDescription: '',
        xmpKeywords: '',
        xmpCreator: '',
        xmpCopyright: '',
        xmpRating: 0,
        xmpColorLabel: 'None'
      });
      setHasMetadataChanges(false);
      setSaveStatus({ type: '', message: '', xmpPath: '' });
    }
  };

  const closeMetadataPanel = () => {
    setMetadataPanelOpen(false);
    setSelectedPhoto(null);
    setEditingPhoto(null);
    setHasMetadataChanges(false);
    setSaveStatus({ type: '', message: '', xmpPath: '' });
  }

  const handleSelectFolder = async () => {
    try {
      if (isDevelopment) {
        // Mock folder selection for development mode
        const mockFolderPath = '/mock/selected/folder';
        
        // Update project with new folder path
        const updatedProject = { ...project, folder_path: mockFolderPath };
        setProject(updatedProject);
        
        // Load photos from the new folder
        await loadPhotosFromFolder(updatedProject);
        
        alert('Mock folder selected: ' + mockFolderPath);
      } else {
        // Use Tauri backend to select folder
        const { invoke } = await import('@tauri-apps/api/core');
        const selectedFolder = await invoke('select_folder');
        
        if (selectedFolder) {
          // Update project with new folder path in the database
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('update_project', {
              projectId: project.id,
              project: { ...project, folder_path: selectedFolder },
              accessToken: accessToken
            });
            
            // Update local project state
            const updatedProject = { ...project, folder_path: selectedFolder };
            setProject(updatedProject);
            
            // Load photos from the new folder
            await loadPhotosFromFolder(updatedProject);
            
          } catch (updateError) {
            console.error('Error updating project in database:', updateError);
            alert('Failed to update project with new folder path. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert('Failed to select folder: ' + error.message);
    }
  }

  const deleteProject = async () => {
    if (!project || !user) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setDeleting(true);
    
    try {
      if (isDevelopment) {
        // Mock delete - just navigate back to dashboard
        navigate('/dashboard?refresh=true');
      } else {
        // Use Tauri backend to delete project
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_project', { 
          projectId: project.id, 
          accessToken 
        });
        
        navigate('/dashboard?refresh=true');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="project-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading project...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="project-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Project Not Found</h3>
          <p>{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!id) {
    return (
      <div className="project-container">
        <div className="no-project-state">
          <div className="no-project-icon">📁</div>
          <h3>No Project Selected</h3>
          <p>Please select a project from the dashboard to get started.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
          <div className="project-container">
        <div className="project-header">
        <button
          onClick={() => navigate('/dashboard')}
          className="back-button"
        >
          <span className="back-arrow">←</span>
          Back to Dashboard
        </button>
        <div className="project-title-section">
          <h1 className="project-title">{project?.name || 'Project'}</h1>
          <p className="project-subtitle">Manage your photo collection</p>
          {isDevelopment && (
            <div className="development-notice">
              🚧 Development Mode - Using Mock Data
            </div>
          )}
        </div>
        <div className="project-actions">
          <button
            onClick={() => navigate(`/project/${id}/edit`)}
            className="btn btn-secondary"
            title="Edit project"
          >
            Edit
          </button>
          <button
            onClick={deleteProject}
            className="btn btn-danger"
            disabled={deleting}
            title="Delete project"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {project && (
        <div className="project-content">
          <div className="project-overview">
            <div className="project-image-section">
              <img
                src={project.image_url || 'https://img.freepik.com/premium-vector/photographer-with-camera-flat-vector-illustration_648489-88.jpg'}
                alt={project.name}
                className="project-hero-image"
              />
            </div>
            <div className="project-details">
              <h2 className="project-name">{project.name}</h2>
              <p className="project-description">{project.description}</p>
              <div className="project-meta">
                <div className="meta-item">
                  <span className="meta-label">Created</span>
                  <span className="meta-value">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status</span>
                  <span className="meta-value status-active">{project.status || 'Active'}</span>
                </div>
                {project.photo_count > 0 && (
                  <div className="meta-item">
                    <span className="meta-label">Photos</span>
                    <span className="meta-value">📸 {project.photo_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Panel - Separate division */}
          {metadataPanelOpen && selectedPhoto && (
            <div className="metadata-sliding-panel">
              <div className="metadata-panel-header">
                <h3>Edit Metadata</h3>
                <button 
                  onClick={closeMetadataPanel}
                  className="close-button"
                >
                  ×
                </button>
              </div>
              <div className="metadata-panel-content">
                <div className="metadata-details">
                  {/* Loading indicator */}
                  {/* {loadingMetadata && (
                    <div className="metadata-loading">
                      <div className="loading-spinner-small"></div>
                      <span>Loading existing metadata...</span>
                    </div>
                  )} */}
                  
                  {/* Editable XMP metadata only */}
                  <div className="metadata-section">
                    <h4 className="metadata-section-title">Edit Photo Metadata</h4>
                    
                    {/* Title */}
                    <div className="metadata-row editable">
                      <label className="metadata-label">Title:</label>
                      <input
                        type="text"
                        className="metadata-input"
                        placeholder="Enter photo title..."
                        value={editingPhoto?.xmpTitle || ''}
                        onChange={(e) => handleMetadataChange('xmpTitle', e.target.value)}
                      />
                    </div>

                    {/* Description */}
                    <div className="metadata-row editable">
                      <label className="metadata-label">Description:</label>
                      <textarea
                        className="metadata-textarea"
                        placeholder="Enter photo description..."
                        value={editingPhoto?.xmpDescription || ''}
                        onChange={(e) => handleMetadataChange('xmpDescription', e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Keywords/Tags */}
                    <div className="metadata-row editable">
                      <label className="metadata-label">Keywords:</label>
                      <input
                        type="text"
                        className="metadata-input"
                        placeholder="Enter keywords separated by commas..."
                        value={editingPhoto?.xmpKeywords || ''}
                        onChange={(e) => handleMetadataChange('xmpKeywords', e.target.value)}
                      />
                    </div>

                    {/* Creator */}
                    <div className="metadata-row editable">
                      <label className="metadata-label">Creator:</label>
                      <input
                        type="text"
                        className="metadata-input"
                        placeholder="Enter creator name..."
                        value={editingPhoto?.xmpCreator || ''}
                        onChange={(e) => handleMetadataChange('xmpCreator', e.target.value)}
                      />
                    </div>

                    {/* Copyright */}
                    <div className="metadata-row editable">
                      <label className="metadata-label">Copyright:</label>
                      <input
                        type="text"
                        className="metadata-input"
                        placeholder="Enter copyright information..."
                        value={editingPhoto?.xmpCopyright || ''}
                        onChange={(e) => handleMetadataChange('xmpCopyright', e.target.value)}
                      />
                    </div>

                    {/* Rating */}
                    <div className="metadata-row editable">
                      <label className="metadata-label">Rating:</label>
                      <div className="rating-input">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-button ${(editingPhoto?.xmpRating || 0) >= star ? 'active' : ''}`}
                            onClick={() => handleMetadataChange('xmpRating', star)}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Label */}
                    <div className="metadata-row editable">
                      <label className="metadata-label">Color Label:</label>
                      <div className="color-label-input">
                        {['None', 'Red', 'Yellow', 'Green', 'Blue', 'Purple'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`color-button ${(editingPhoto?.xmpColorLabel || 'None') === color ? 'active' : ''}`}
                            onClick={() => handleMetadataChange('xmpColorLabel', color)}
                            data-color={color}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status display */}
                  {saveStatus.type && (
                    <div className={`metadata-status ${saveStatus.type}`}>
                      <div className="status-icon">
                        {saveStatus.type === 'success' ? '✅' : '❌'}
                      </div>
                      <div className="status-content">
                        <div className="status-message">{saveStatus.message}</div>
                        {saveStatus.xmpPath && (
                          <div className="status-xmp-path">
                            <strong>XMP file:</strong> {saveStatus.xmpPath}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="metadata-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveMetadata}
                      disabled={!hasMetadataChanges}
                    >
                      💾 Save Changes
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleResetMetadata}
                      disabled={!hasMetadataChanges}
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Photo Grid Section */}
          <div className={`photo-grid-section ${metadataPanelOpen ? 'panel-open' : ''}`}>
            <div className="section-header">
              <h2 className="section-title">Photos</h2>
              {/* Current folder name display */}
              {project?.folder_path && (
                <div style={{fontSize: '14px', color: '#666', marginTop: '5px', fontStyle: 'italic'}}>
                  📁 Current folder: {project.folder_path.split(/[\\/]/).pop() || 'Unknown'}
                </div>
              )}
              
              {/* Choose Folder Button */}
              <button 
                onClick={handleSelectFolder}
                className="choose-folder-btn"
              >
                📁 Choose Different Folder
              </button>
              
              {/* Chunk loading progress bar */}
              {allPhotos.length > 0 && (
                <div className="chunk-progress" style={{marginTop: '10px'}}>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{
                        width: `${(thumbnailCache.size / allPhotos.length) * 100}%`,
                        transition: 'width 0.3s ease'
                      }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {Math.round((thumbnailCache.size / allPhotos.length) * 100)}% loaded
                  </div>
                </div>
              )}
            </div>

            {photosLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading photos from folder...</p>
              </div>
            ) : allPhotos.length > 0 ? (
              <div className="photo-grid" ref={photoGridRef}>
                {visiblePhotos.map((photo, index) => {
                  const chunkNumber = Math.floor(index / PHOTOS_PER_CHUNK);
                  const thumbnailUrl = thumbnailCache.get(photo.id);
                  const isLoadingThumbnail = loadingThumbnails.has(photo.id);
                  
                  return (
                    <div 
                      key={photo.id} 
                      className="photo-item"
                      onClick={() => handlePhotoClick(photo)}
                      title={`Photo ${index + 1} of ${allPhotos.length}`}
                    >
                      <div className="photo-thumbnail">
                        {thumbnailUrl ? (
                          <img 
                            src={thumbnailUrl} 
                            alt={photo.name}
                            className="photo-thumbnail-image"
                            loading="lazy"
                          />
                        ) : isLoadingThumbnail ? (
                          <div className="photo-placeholder loading">
                            <div className="loading-spinner-small"></div>
                            <span className="loading-text">Loading...</span>
                          </div>
                        ) : (
                          <div className="photo-placeholder">
                            <span className="photo-icon">📷</span>
                          </div>
                        )}
                      </div>
                      <div className="photo-info">
                        <span className="photo-name">{photo.name}</span>
                        <span className="photo-size">{photo.size}</span>
                      </div>
                    </div>
                  );
                })}
                
                {/* Loading sentinel for intersection observer */}
                {visiblePhotos.length < allPhotos.length && (
                  <div 
                    ref={sentinelRef}
                    className="loading-sentinel"
                    style={{ 
                      width: '100%', 
                      height: '20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#666',
                      fontSize: '14px'
                    }}
                  >
                    {isLoadingMore ? (
                      <span>🔄 Loading more photos...</span>
                    ) : (
                      <span>⬇️ Scroll to load more photos</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-photos">
                <div className="empty-icon">📁</div>
                <h3>No Photos Found</h3>
                <p>
                  {project?.folder_path 
                    ? `No photos were found in the selected folder: ${project.folder_path}`
                    : 'No folder has been selected for this project yet.'
                  }
                </p>
                <button 
                  onClick={handleSelectFolder}
                  className="btn btn-primary"
                >
                  {project?.folder_path ? 'Change Folder' : 'Select Folder'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  )
}

export default Project 