'use client';

import { useState, useCallback } from 'react';
import type { Email, EmailsResponse, MatchResponse } from '../types';

interface UseEmailSyncOptions {
  adminPassword: string;
}

export function useEmailSync({ adminPassword }: UseEmailSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [syncResults, setSyncResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync emails from IMAP server
  const syncEmails = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    setSyncResults([]);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/emails/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        }
      });

      if (response.status === 503) {
        setSyncResults([
          'Service nicht verfügbar (503)',
          'E-Mail-Sync benötigt Cloudflare Workers TCP-Sockets',
          'Diese Funktion funktioniert nur in der Produktionsumgebung',
          'Lokal können E-Mails manuell erfasst werden'
        ]);
        setError('E-Mail-Sync nur in Produktion verfügbar');
        return false;
      }

      if (!response.ok) {
        const text = await response.text();
        if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
          setError(`Server-Fehler (${response.status})`);
          return false;
        }
        try {
          const errorData = JSON.parse(text) as { error?: string };
          setError(errorData.error || `Fehler: ${response.status}`);
        } catch {
          setError(`Server-Fehler: ${response.status}`);
        }
        return false;
      }

      const data = await response.json() as {
        success: boolean;
        imported?: number;
        skipped?: number;
        folders?: string[];
        errors?: string[];
        error?: string;
        instructions?: string[];
      };

      if (data.success) {
        const results: string[] = [];
        if (data.folders) {
          results.push(...data.folders.map(f => `✓ ${f}`));
        }
        results.push(`✓ ${data.imported} E-Mails importiert`);
        if (data.skipped && data.skipped > 0) {
          results.push(`○ ${data.skipped} übersprungen (bereits vorhanden)`);
        }
        if (data.errors && data.errors.length > 0) {
          results.push(...data.errors.map(e => `⚠ ${e}`));
        }
        setSyncResults(results);
        setSuccess(`E-Mail-Synchronisation abgeschlossen: ${data.imported} importiert`);
        return true;
      } else {
        if (data.instructions) {
          setSyncResults(data.instructions);
        }
        setError(data.error || 'Synchronisation fehlgeschlagen');
        return false;
      }
    } catch (err) {
      console.error('Email sync error:', err);
      setSyncResults([
        'Verbindungsfehler',
        'E-Mail-Sync benötigt Cloudflare Workers Umgebung',
        'Lokal können E-Mails manuell erfasst werden'
      ]);
      setError('E-Mail-Sync fehlgeschlagen - nur in Produktion verfügbar');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [adminPassword]);

  // Match emails to guests
  const matchEmails = useCallback(async (): Promise<number> => {
    setIsMatching(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/emails/match', {
        method: 'POST',
        headers: { 'x-admin-password': adminPassword }
      });

      const data = await response.json() as MatchResponse;
      if (data.error) {
        setError(data.error);
        return 0;
      } else {
        setSuccess(`${data.matched} E-Mails wurden Gästen zugeordnet`);
        return data.matched || 0;
      }
    } catch (err) {
      setError('Fehler beim Zuordnen der E-Mails');
      console.error(err);
      return 0;
    } finally {
      setIsMatching(false);
    }
  }, [adminPassword]);

  return {
    isSyncing,
    isMatching,
    syncResults,
    error,
    setError,
    success,
    setSuccess,
    syncEmails,
    matchEmails,
  };
}

// Hook for managing unassigned emails
export function useUnassignedEmails({ adminPassword }: UseEmailSyncOptions) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load unassigned email count
  const loadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/emails?unassigned=true&limit=1');
      const data = await response.json() as EmailsResponse;
      setCount(data.total || 0);
    } catch (err) {
      console.error('Error loading unassigned count:', err);
    }
  }, []);

  // Load unassigned emails list
  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/emails?unassigned=true&limit=50');
      const data = await response.json() as EmailsResponse;
      setEmails(data.emails || []);
      setCount(data.total || 0);
    } catch (err) {
      console.error('Error loading unassigned emails:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Assign email to guest
  const assignToGuest = useCallback(async (emailId: number, guestId: number): Promise<boolean> => {
    setAssigningId(emailId);
    try {
      const response = await fetch('/api/admin/emails', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: emailId, guest_id: guestId })
      });

      const data = await response.json() as { error?: string; success?: boolean };
      if (data.error) {
        setError(data.error);
        return false;
      }
      setSuccess('E-Mail erfolgreich zugeordnet');
      await loadEmails();
      return true;
    } catch (err) {
      setError('Fehler beim Zuordnen');
      console.error(err);
      return false;
    } finally {
      setAssigningId(null);
    }
  }, [adminPassword, loadEmails]);

  // Mark email as organization (no guest assignment)
  const markAsOrganization = useCallback(async (emailId: number): Promise<boolean> => {
    setAssigningId(emailId);
    try {
      const response = await fetch('/api/admin/emails', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword
        },
        body: JSON.stringify({ id: emailId, guest_id: -1 }) // -1 = Orgathema
      });

      const data = await response.json() as { error?: string; success?: boolean };
      if (data.error) {
        setError(data.error);
        return false;
      }
      setSuccess('E-Mail als Orgathema markiert');
      await loadEmails();
      return true;
    } catch (err) {
      setError('Fehler beim Markieren');
      console.error(err);
      return false;
    } finally {
      setAssigningId(null);
    }
  }, [adminPassword, loadEmails]);

  return {
    emails,
    count,
    loading,
    assigningId,
    error,
    setError,
    success,
    setSuccess,
    loadCount,
    loadEmails,
    assignToGuest,
    markAsOrganization,
  };
}
