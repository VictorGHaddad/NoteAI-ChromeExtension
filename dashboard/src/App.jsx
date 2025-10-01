import React, { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material'
import {
  Mic,
  Refresh,
  Delete,
  Visibility,
  Add,
  AudioFile,
  Summarize,
  Schedule,
  Language,
} from '@mui/icons-material'
import axios from 'axios'

const API_BASE_URL = 'http://10.0.0.111:8000/api'

function App() {
  const [transcriptions, setTranscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTranscription, setSelectedTranscription] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchTranscriptions()
  }, [])

  const fetchTranscriptions = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get(`${API_BASE_URL}/audio/transcriptions`)
      setTranscriptions(response.data.transcriptions || [])
    } catch (err) {
      setError(`Erro ao carregar transcrições: ${err.message}`)
      console.error('Error fetching transcriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteTranscription = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/audio/transcriptions/${id}`)
      setTranscriptions(prev => prev.filter(t => t.id !== id))
      if (selectedTranscription && selectedTranscription.id === id) {
        setDialogOpen(false)
        setSelectedTranscription(null)
      }
    } catch (err) {
      setError(`Erro ao deletar transcrição: ${err.message}`)
    }
  }

  const regenerateSummary = async (id) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/audio/transcriptions/${id}/regenerate-summary`)
      setTranscriptions(prev => 
        prev.map(t => t.id === id ? response.data : t)
      )
      if (selectedTranscription && selectedTranscription.id === id) {
        setSelectedTranscription(response.data)
      }
    } catch (err) {
      setError(`Erro ao regenerar resumo: ${err.message}`)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const openTranscriptionDialog = (transcription) => {
    setSelectedTranscription(transcription)
    setDialogOpen(true)
  }

  const getTotalStats = () => {
    const total = transcriptions.length
    const totalDuration = transcriptions.reduce((acc, t) => acc + (t.duration || 0), 0)
    const totalSize = transcriptions.reduce((acc, t) => acc + (t.file_size || 0), 0)
    
    return { total, totalDuration, totalSize }
  }

  const stats = getTotalStats()

  return (
    <div className="app-container">
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <Mic sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Audio Transcriber Dashboard
          </Typography>
          <IconButton color="inherit" onClick={fetchTranscriptions}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" className="content-container">
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stats-card">
              <CardContent sx={{ textAlign: 'center' }}>
                <AudioFile sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {stats.total}
                </Typography>
                <Typography variant="body2">
                  Transcrições
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stats-card">
              <CardContent sx={{ textAlign: 'center' }}>
                <Schedule sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {formatDuration(stats.totalDuration)}
                </Typography>
                <Typography variant="body2">
                  Duração Total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stats-card">
              <CardContent sx={{ textAlign: 'center' }}>
                <Summarize sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {transcriptions.filter(t => t.summary).length}
                </Typography>
                <Typography variant="body2">
                  Com Resumo
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="stats-card">
              <CardContent sx={{ textAlign: 'center' }}>
                <Language sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {formatFileSize(stats.totalSize)}
                </Typography>
                <Typography variant="body2">
                  Tamanho Total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={60} />
          </Box>
        ) : transcriptions.length === 0 ? (
          <Card sx={{ textAlign: 'center', p: 4 }}>
            <CardContent>
              <Mic sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" component="div" gutterBottom>
                Nenhuma transcrição encontrada
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Use a extensão Chrome para gravar e transcrever áudio
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {transcriptions.map((transcription) => (
              <Grid item xs={12} md={6} lg={4} key={transcription.id}>
                <Card className="transcription-card" onClick={() => openTranscriptionDialog(transcription)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="div" noWrap sx={{ maxWidth: '70%' }}>
                        {transcription.filename}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation()
                            openTranscriptionDialog(transcription)
                          }}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTranscription(transcription.id)
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" className="scrollable-text" sx={{ maxHeight: '80px', fontSize: '0.85rem' }}>
                        {transcription.text.length > 150 
                          ? transcription.text.substring(0, 150) + '...'
                          : transcription.text
                        }
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {transcription.language && (
                        <Chip 
                          label={transcription.language.toUpperCase()} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      )}
                      {transcription.duration && (
                        <Chip 
                          label={formatDuration(transcription.duration)} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                      {transcription.summary && (
                        <Chip 
                          label="Com resumo" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      {formatDate(transcription.created_at)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Floating Action Button */}
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
          onClick={fetchTranscriptions}
        >
          <Refresh />
        </Fab>
      </Container>

      {/* Transcription Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        {selectedTranscription && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div">
                  {selectedTranscription.filename}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<Summarize />}
                    onClick={() => regenerateSummary(selectedTranscription.id)}
                  >
                    Regenerar Resumo
                  </Button>
                  <IconButton 
                    color="error"
                    onClick={() => deleteTranscription(selectedTranscription.id)}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(selectedTranscription.created_at)}
                </Typography>
                {selectedTranscription.duration && (
                  <Typography variant="caption" color="text.secondary">
                    Duração: {formatDuration(selectedTranscription.duration)}
                  </Typography>
                )}
                {selectedTranscription.language && (
                  <Typography variant="caption" color="text.secondary">
                    Idioma: {selectedTranscription.language.toUpperCase()}
                  </Typography>
                )}
                {selectedTranscription.file_size && (
                  <Typography variant="caption" color="text.secondary">
                    Tamanho: {formatFileSize(selectedTranscription.file_size)}
                  </Typography>
                )}
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                  📝 Transcrição
                </Typography>
                <Box className="scrollable-text" sx={{ maxHeight: '200px' }}>
                  {selectedTranscription.text}
                </Box>
              </Box>

              {selectedTranscription.summary && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ color: 'secondary.main' }}>
                      📋 Resumo
                    </Typography>
                    <Box className="scrollable-text" sx={{ maxHeight: '150px' }}>
                      {selectedTranscription.summary}
                    </Box>
                  </Box>
                </>
              )}
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>
                Fechar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  )
}

export default App