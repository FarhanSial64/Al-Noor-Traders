import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress } from '@mui/material';
import { FileDownload, PictureAsPdf, TableChart } from '@mui/icons-material';
import { exportToPDF, exportToExcel } from '../../utils/exportUtils';

/**
 * Reusable Export Buttons component for PDF and Excel exports
 * @param {Object} props
 * @param {string} props.title - Report title
 * @param {string} props.subtitle - Report subtitle (optional)
 * @param {Array} props.columns - Column definitions
 * @param {Array} props.data - Data to export
 * @param {string} props.filename - Base filename (without extension)
 * @param {Object} props.headerInfo - Header information (optional)
 * @param {Object} props.summary - Summary data (optional)
 * @param {string} props.orientation - PDF orientation 'portrait' or 'landscape' (optional)
 * @param {boolean} props.disabled - Disable export buttons
 * @param {Function} props.onExport - Callback after export (optional)
 */
const ExportButtons = ({
  title,
  subtitle = '',
  columns,
  data,
  filename,
  headerInfo = null,
  summary = null,
  orientation = 'portrait',
  disabled = false,
  onExport = null
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [exporting, setExporting] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      handleClose();
      
      exportToPDF({
        title,
        subtitle,
        columns,
        data,
        filename,
        headerInfo,
        summary,
        orientation
      });

      if (onExport) onExport('pdf');
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      handleClose();
      
      exportToExcel({
        title,
        columns,
        data,
        filename,
        headerInfo,
        summary
      });

      if (onExport) onExport('excel');
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={exporting ? <CircularProgress size={16} /> : <FileDownload />}
        onClick={handleClick}
        disabled={disabled || exporting || !data || data.length === 0}
        size="small"
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleExportPDF}>
          <ListItemIcon>
            <PictureAsPdf fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Export as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportExcel}>
          <ListItemIcon>
            <TableChart fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>Export as Excel</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportButtons;
