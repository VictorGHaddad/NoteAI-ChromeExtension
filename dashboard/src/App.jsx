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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material'
import {
  Mic,
  Refresh,
  Delete,
  Close,
  MoreVert,
  Replay,
  Download,
  ViewComfy,
  ViewStream,
  ViewCompact,
  TextFields,
} from '@mui/icons-material'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import { saveAs } from 'file-saver'

const API_BASE_URL = 'http://10.0.0.111:8000/api'

function App() {
  const [transcriptions, setTranscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTranscription, setSelectedTranscription] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('viewMode') || 'normal')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium')
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null)

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
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins === 0) return `${secs}s`
    return `${mins}min ${secs}s`
  }

  const openTranscriptionDialog = (transcription) => {
    try {
      console.log('Opening transcription:', transcription)
      setSelectedTranscription(transcription)
      setDialogOpen(true)
    } catch (error) {
      console.error('Error opening transcription dialog:', error)
      alert('Erro ao abrir transcrição: ' + error.message)
    }
  }

  // Export functions
  const exportAsPDF = (transcription) => {
    try {
      console.log('Exporting PDF for:', transcription)
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 20
      const maxWidth = pageWidth - 2 * margin
      let y = margin

      // Helper to add text with wrapping
      const addText = (text, fontSize = 10, isBold = false) => {
        doc.setFontSize(fontSize)
        doc.setFont(undefined, isBold ? 'bold' : 'normal')
        const lines = doc.splitTextToSize(text, maxWidth)
        
        lines.forEach(line => {
          if (y + 10 > pageHeight - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(line, margin, y)
          y += fontSize / 2 + 2
        })
        y += 3
      }

      // Title
      addText('ATA DE REUNIÃO', 16, true)
      y += 5

      // Extract date/time from summary if present
      if (transcription.summary) {
        const dateMatch = transcription.summary.match(/Data:\s*(.+)/i)
        const timeMatch = transcription.summary.match(/Hora:\s*(.+)/i)
        
        if (dateMatch) addText(dateMatch[0], 10)
        if (timeMatch) addText(timeMatch[0], 10)
      }
      
      addText(`Arquivo: ${transcription.filename}`, 10)
      if (transcription.duration) addText(`Duração: ${formatDuration(transcription.duration)}`, 10)
      if (transcription.language) addText(`Idioma: ${transcription.language}`, 10)
      
      y += 10

      // Summary or transcription
      if (transcription.summary) {
        addText(transcription.summary, 10)
      } else {
        addText('TRANSCRIÇÃO:', 12, true)
        y += 3
        addText(transcription.text, 10)
      }

      // Save
      const filename = `ata_${transcription.filename.replace(/\.[^/.]+$/, '')}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Erro ao exportar PDF: ' + error.message)
    }
  }

  const exportAsText = (transcription) => {
    const summarySection = transcription.summary ? `${transcription.summary}

=====================================
TRANSCRIÇÃO COMPLETA
=====================================

` : ''
    
    const content = `ATA DE REUNIÃO

${summarySection}${transcription.text}

=====================================
Informações do Arquivo
=====================================
Arquivo: ${transcription.filename}
Data: ${formatDate(transcription.created_at)}
${transcription.duration ? `Duração: ${formatDuration(transcription.duration)}` : ''}
${transcription.language ? `Idioma: ${transcription.language}` : ''}
`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const filename = `ata_${transcription.filename.replace(/\.[^/.]+$/, '')}.txt`
    saveAs(blob, filename)
  }

  const exportAsMarkdown = (transcription) => {
    const summarySection = transcription.summary 
      ? `${transcription.summary}\n\n---\n\n## TRANSCRIÇÃO COMPLETA\n\n` 
      : '## TRANSCRIÇÃO\n\n'
    
    const content = `# ATA DE REUNIÃO

${summarySection}${transcription.text}

---

### Informações do Arquivo

- **Arquivo:** ${transcription.filename}
- **Data:** ${formatDate(transcription.created_at)}
${transcription.duration ? `- **Duração:** ${formatDuration(transcription.duration)}` : ''}
${transcription.language ? `- **Idioma:** ${transcription.language}` : ''}
`
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const filename = `ata_${transcription.filename.replace(/\.[^/.]+$/, '')}.md`
    saveAs(blob, filename)
  }

  // View mode handlers
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode)
      localStorage.setItem('viewMode', newMode)
    }
  }

  const handleFontSizeChange = (event) => {
    setFontSize(event.target.value)
    localStorage.setItem('fontSize', event.target.value)
  }

  const handleExportClick = (event) => {
    setExportMenuAnchor(event.currentTarget)
  }

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget)
  }

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null)
  }

  const handleExportClose = () => {
    setExportMenuAnchor(null)
  }

  const handleExport = (format) => {
    if (!selectedTranscription) return
    
    switch (format) {
      case 'pdf':
        exportAsPDF(selectedTranscription)
        break
      case 'txt':
        exportAsText(selectedTranscription)
        break
      case 'md':
        exportAsMarkdown(selectedTranscription)
        break
    }
    handleExportClose()
  }

  const getTotalStats = () => {
    const total = transcriptions.length
    const totalDuration = transcriptions.reduce((acc, t) => acc + (t.duration || 0), 0)
    
    return { total, totalDuration }
  }

  const stats = getTotalStats()

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#fafafa',
    }}>
      {/* Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: '#e5e5e5',
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box sx={{ 
              width: 32, 
              height: 32, 
              borderRadius: '6px',
              bgcolor: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
            }}>
              <Mic sx={{ color: 'white', fontSize: 18 }} />
            </Box>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                color: 'black',
                fontWeight: 600,
                fontSize: '1.1rem',
              }}
            >
              Audio Transcriber
            </Typography>
          </Box>
          <IconButton 
            onClick={fetchTranscriptions}
            sx={{ 
              color: '#666',
              '&:hover': { bgcolor: '#f5f5f5' }
            }}
          >
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* View Controls */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 2,
            mb: 3,
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            bgcolor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
              Visualização:
            </Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  border: '1px solid #e5e5e5',
                  color: '#666',
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'black',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#333',
                    }
                  },
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  }
                }
              }}
            >
              <ToggleButton value="compact">
                <ViewCompact sx={{ mr: 0.5, fontSize: 18 }} />
                Compacto
              </ToggleButton>
              <ToggleButton value="normal">
                <ViewStream sx={{ mr: 0.5, fontSize: 18 }} />
                Normal
              </ToggleButton>
              <ToggleButton value="expanded">
                <ViewComfy sx={{ mr: 0.5, fontSize: 18 }} />
                Expandido
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tamanho da Fonte</InputLabel>
            <Select
              value={fontSize}
              label="Tamanho da Fonte"
              onChange={handleFontSizeChange}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e5e5e5',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d4d4d4',
                },
              }}
            >
              <MenuItem value="small">
                <TextFields sx={{ mr: 1, fontSize: 16 }} />
                Pequeno
              </MenuItem>
              <MenuItem value="medium">
                <TextFields sx={{ mr: 1, fontSize: 18 }} />
                Médio
              </MenuItem>
              <MenuItem value="large">
                <TextFields sx={{ mr: 1, fontSize: 20 }} />
                Grande
              </MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* Stats Bar */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3,
            mb: 4,
            border: '1px solid #e5e5e5',
            borderRadius: '12px',
            bgcolor: 'white',
          }}
        >
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" sx={{ color: '#666', mb: 0.5, fontSize: '0.875rem' }}>
                  Total de transcrições
                </Typography>
                <Typography variant="h4" sx={{ color: 'black', fontWeight: 600 }}>
                  {stats.total}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" sx={{ color: '#666', mb: 0.5, fontSize: '0.875rem' }}>
                  Tempo total gravado
                </Typography>
                <Typography variant="h4" sx={{ color: 'black', fontWeight: 600 }}>
                  {Math.floor(stats.totalDuration / 60)}min
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="body2" sx={{ color: '#666', mb: 0.5, fontSize: '0.875rem' }}>
                  Com resumo
                </Typography>
                <Typography variant="h4" sx={{ color: 'black', fontWeight: 600 }}>
                  {transcriptions.filter(t => t.summary).length}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Error Message */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              border: '1px solid #fee',
              borderRadius: '8px',
              '& .MuiAlert-icon': { color: '#d32f2f' }
            }} 
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: 'black' }} size={40} />
          </Box>
        ) : transcriptions.length === 0 ? (
          <Paper 
            elevation={0}
            sx={{ 
              textAlign: 'center', 
              py: 8,
              px: 4,
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              bgcolor: 'white',
            }}
          >
            <Box sx={{ 
              width: 56, 
              height: 56, 
              borderRadius: '50%',
              bgcolor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}>
              <Mic sx={{ fontSize: 28, color: '#999' }} />
            </Box>
            <Typography variant="h6" sx={{ color: 'black', fontWeight: 600, mb: 1 }}>
              Nenhuma transcrição ainda
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', maxWidth: 400, mx: 'auto' }}>
              Use a extensão Chrome para gravar e transcrever áudio automaticamente
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {transcriptions.map((transcription) => {
              const getFontSize = () => {
                switch (fontSize) {
                  case 'small': return { title: '0.85rem', body: '0.8rem', caption: '0.7rem' }
                  case 'large': return { title: '1.1rem', body: '1rem', caption: '0.85rem' }
                  default: return { title: '0.95rem', body: '0.9rem', caption: '0.8rem' }
                }
              }

              const getLineClamp = () => {
                switch (viewMode) {
                  case 'compact': return 1
                  case 'expanded': return 6
                  default: return 2
                }
              }

              const getPadding = () => {
                switch (viewMode) {
                  case 'compact': return 2
                  case 'expanded': return 4
                  default: return 3
                }
              }

              const sizes = getFontSize()

              return (
                <Paper
                  key={transcription.id}
                  elevation={0}
                  sx={{
                    p: getPadding(),
                    border: '1px solid #e5e5e5',
                    borderRadius: '12px',
                    bgcolor: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#ccc',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    },
                  }}
                  onClick={() => openTranscriptionDialog(transcription)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color: 'black',
                            fontWeight: 600,
                            fontSize: sizes.title,
                          }}
                        >
                          {transcription.filename}
                        </Typography>
                        {transcription.summary && (
                          <Chip 
                            label="Resumido" 
                            size="small"
                            sx={{ 
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: '#f5f5f5',
                              color: '#666',
                              fontWeight: 500,
                            }}
                          />
                        )}
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#666',
                          fontSize: sizes.body,
                          mb: viewMode === 'compact' ? 1 : 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: getLineClamp(),
                          WebkitBoxOrient: 'vertical',
                          lineHeight: viewMode === 'expanded' ? 1.6 : 1.5,
                        }}
                      >
                        {transcription.text}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#999', fontSize: sizes.caption }}>
                          {formatDate(transcription.created_at)}
                        </Typography>
                        {transcription.duration && (
                          <>
                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#ddd' }} />
                            <Typography variant="caption" sx={{ color: '#999', fontSize: sizes.caption }}>
                              {formatDuration(transcription.duration)}
                            </Typography>
                          </>
                        )}
                        {transcription.language && (
                          <>
                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#ddd' }} />
                            <Typography variant="caption" sx={{ color: '#999', fontSize: sizes.caption }}>
                              {transcription.language.toUpperCase()}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>

                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTranscription(transcription.id)
                      }}
                      sx={{ 
                        color: '#999',
                        '&:hover': { 
                          color: '#d32f2f',
                          bgcolor: '#fee'
                        }
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Paper>
              )
            })}
          </Box>
        )}
      </Container>

      {/* Transcription Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: '16px',
            maxHeight: '90vh',
          }
        }}
      >
        {selectedTranscription ? (
          <>
            <DialogTitle sx={{ pb: 2, pt: 3, px: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography variant="h6" sx={{ color: 'black', fontWeight: 600, mb: 1 }}>
                    {selectedTranscription.filename || 'Sem título'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {selectedTranscription.created_at && (
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {formatDate(selectedTranscription.created_at)}
                      </Typography>
                    )}
                    {selectedTranscription.duration && (
                      <>
                        <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#ddd' }} />
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          {formatDuration(selectedTranscription.duration)}
                        </Typography>
                      </>
                    )}
                    {selectedTranscription.language && (
                      <>
                        <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#ddd' }} />
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          {selectedTranscription.language.toUpperCase()}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>

                <IconButton 
                  onClick={() => setDialogOpen(false)}
                  sx={{ 
                    color: '#999',
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                >
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ px: 3, pb: 3 }}>
              <Box sx={{ mb: 4 }}>
                <Typography 
                  variant="overline" 
                  sx={{ 
                    color: '#999',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    mb: 1,
                    display: 'block',
                  }}
                >
                  TRANSCRIÇÃO
                </Typography>
                <Box 
                  sx={{ 
                    maxHeight: '200px',
                    overflowY: 'auto',
                    p: 2,
                    bgcolor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #e5e5e5',
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#333',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedTranscription.text}
                  </Typography>
                </Box>
              </Box>

              {selectedTranscription.summary && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: '#999',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                      }}
                    >
                      RESUMO
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Replay />}
                      onClick={() => regenerateSummary(selectedTranscription.id)}
                      sx={{
                        color: '#666',
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        '&:hover': { bgcolor: '#f5f5f5' }
                      }}
                    >
                      Regenerar
                    </Button>
                  </Box>
                  <Box 
                    sx={{ 
                      maxHeight: '150px',
                      overflowY: 'auto',
                      p: 2,
                      bgcolor: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #e5e5e5',
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#333',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {selectedTranscription.summary}
                    </Typography>
                  </Box>
                </Box>
              )}
            </DialogContent>
            
            <DialogActions sx={{ px: 3, pb: 3, pt: 0, justifyContent: 'space-between' }}>
              <Button 
                onClick={() => deleteTranscription(selectedTranscription.id)}
                startIcon={<Delete />}
                sx={{
                  color: '#d32f2f',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#fee' }
                }}
              >
                Deletar
              </Button>
              
              <Box>
                <Button
                  startIcon={<Download />}
                  onClick={handleExportMenuOpen}
                  sx={{
                    color: '#000',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#f5f5f5' }
                  }}
                >
                  Exportar
                </Button>
                <Menu
                  anchorEl={exportMenuAnchor}
                  open={Boolean(exportMenuAnchor)}
                  onClose={handleExportMenuClose}
                  MenuListProps={{
                    sx: {
                      '& .MuiMenuItem-root': {
                        fontSize: '14px',
                        py: 1.5,
                        '&:hover': {
                          bgcolor: '#f5f5f5'
                        }
                      }
                    }
                  }}
                >
                  <MenuItem onClick={() => { exportAsPDF(); handleExportMenuClose(); }}>
                    PDF
                  </MenuItem>
                  <MenuItem onClick={() => { exportAsText(); handleExportMenuClose(); }}>
                    Texto (.txt)
                  </MenuItem>
                  <MenuItem onClick={() => { exportAsMarkdown(); handleExportMenuClose(); }}>
                    Markdown (.md)
                  </MenuItem>
                </Menu>
              </Box>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Box>
  )
}

export default App