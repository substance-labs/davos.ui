import { useState } from 'react';

interface DialogManagementOptions {
  onClose?: () => void;
}

export function useDialogManagement({ onClose }: DialogManagementOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && onClose) {
      onClose();
    }
  };

  return {
    isOpen,
    setIsOpen,
    handleOpen,
    handleClose,
    handleOpenChange,
  };
}
