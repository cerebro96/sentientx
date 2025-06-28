'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onNameUpdate: (newName: string) => void;
}

interface ValidationErrors {
  fullName?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ProfileDialog({ isOpen, onClose, currentName, onNameUpdate }: ProfileDialogProps) {
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState({
    fullName: false,
    newPassword: false,
    confirmPassword: false
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setFullName(currentName || '');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setTouched({
        fullName: false,
        newPassword: false,
        confirmPassword: false
      });
    }
  }, [isOpen, currentName]);

  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Validate passwords if user is trying to change password
    if (newPassword || confirmPassword) {
      if (!newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (newPassword !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    return newErrors;
  };

  const handleFieldBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate on blur
    const newErrors = validateForm();
    setErrors(newErrors);
  };

  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case 'fullName':
        setFullName(value);
        break;
      case 'newPassword':
        setNewPassword(value);
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
    }

    // Clear error for this field when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleUpdateProfile = async () => {
    // Mark all fields as touched for validation
    setTouched({
      fullName: true,
      newPassword: true,
      confirmPassword: true
    });

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the validation errors before saving');
      return;
    }

    try {
      setIsLoading(true);
      let hasUpdates = false;

      // Update name if changed
      if (fullName.trim() !== currentName) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: { full_name: fullName.trim() }
        });

        if (updateError) throw updateError;
        onNameUpdate(fullName.trim());
        toast.success('Name updated successfully');
        hasUpdates = true;
      }

      // Update password if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (passwordError) throw passwordError;
        toast.success('Password updated successfully');
        hasUpdates = true;
      }

      if (!hasUpdates) {
        toast.info('No changes to save');
      }

      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const validationErrors = validateForm();
    return Object.keys(validationErrors).length === 0 && fullName.trim();
  };

  const hasChanges = () => {
    return fullName.trim() !== currentName || newPassword || confirmPassword;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        {currentName && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Current name: <strong>{currentName}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              onBlur={() => handleFieldBlur('fullName')}
              placeholder="Enter your full name"
              className={errors.fullName && touched.fullName ? 'border-destructive' : ''}
            />
            {errors.fullName && touched.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newPassword">New Password (Optional)</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              onBlur={() => handleFieldBlur('newPassword')}
              placeholder="Enter new password (min 6 characters)"
              className={errors.newPassword && touched.newPassword ? 'border-destructive' : ''}
            />
            {errors.newPassword && touched.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">
              Confirm New Password {newPassword && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              onBlur={() => handleFieldBlur('confirmPassword')}
              placeholder="Confirm new password"
              disabled={!newPassword}
              className={errors.confirmPassword && touched.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && touched.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          {newPassword && confirmPassword && newPassword === confirmPassword && (
            <div className="text-sm text-green-600 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              Passwords match
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateProfile} 
            disabled={isLoading || !isFormValid() || !hasChanges()}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 