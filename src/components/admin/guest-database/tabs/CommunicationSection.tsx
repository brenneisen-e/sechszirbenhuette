'use client';

import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';

// German month name mapping
const GERMAN_MONTHS: Record<string, string> = {
  'jan': '01', 'januar': '01',
  'feb': '02', 'februar': '02',
  'mär': '03', 'märz': '03', 'maer': '03', 'maerz': '03', 'mar': '03',
  'apr': '04', 'april': '04',
  'mai': '05',
  'jun': '06', 'juni': '06',
  'jul': '07', 'juli': '07',
  'aug': '08', 'august': '08',
  'sep': '09', 'sept': '09', 'september': '09',
  'okt': '10', 'oktober': '10',
  'nov': '11', 'november': '11',
  'dez': '12', 'dezember': '12',
};

// Convert German month name date to standard format
// "07. Okt. 2024 - 22:02" -> "07.10.2024 22:02"
function parseGermanDate(dateStr: string): string | null {
  // Match format: DD. Mon. YYYY - HH:MM or DD. Mon. YYYY
  const match = dateStr.match(/^(\d{1,2})\.\s*([A-Za-zäöü]+)\.?\s+(\d{4})(?:\s*[-–—]\s*(\d{1,2}:\d{2}))?/i);
  if (!match) return null;

  const [, day, monthName, year, time] = match;
  const monthKey = monthName.toLowerCase().replace(/\.$/, '');
  const month = GERMAN_MONTHS[monthKey];

  if (!month) return null;

  const dayPadded = day.padStart(2, '0');
  const timeStr = time ? ` ${time}` : '';
  return `${dayPadded}.${month}.${year}${timeStr}`;
}

// Helper to determine sender and parse message content
function parseMessageContent(
  content: string,
  date: string,
  messages: Array<{ sender: 'host' | 'guest'; text: string; date?: string }>
) {
  // Host indicators: "Sie:", "Sie haben", "Sie die", "Gastgeber:"
  const isHost = /^Sie[:\s]/i.test(content) ||
    /^Sie\s+(haben|die)/i.test(content) ||
    /^Gastgeber:/i.test(content);

  // Guest indicators: "Gast:"
  const isGuest = /^Gast:/i.test(content);

  if (isHost) {
    // Remove "Sie: " or "Gastgeber: " prefix if present
    const text = content.replace(/^(Sie|Gastgeber):\s*/i, '');
    messages.push({ sender: 'host', text, date: date || undefined });
  } else if (isGuest) {
    // Remove "Gast: " prefix
    const text = content.replace(/^Gast:\s*/i, '');
    messages.push({ sender: 'guest', text, date: date || undefined });
  } else {
    // Guest message - remove "Name: " prefix (fallback for old format)
    const nameMatch = content.match(/^([^:]+):\s*/);
    if (nameMatch) {
      const text = content.substring(nameMatch[0].length);
      messages.push({ sender: 'guest', text, date: date || undefined });
    } else {
      messages.push({ sender: 'guest', text: content, date: date || undefined });
    }
  }
}

// Parse communication into chat messages
// Format variations:
// 1. "DD.MM.YYYY" on one line, then message text on following lines
// 2. "DD.MM.YYYY HH:MM - Name: Message" all on one line
// 3. "DD. Mon. YYYY - HH:MM" with German month names (FeWo format)
export function parseCommunication(communication: string): Array<{ sender: 'host' | 'guest'; text: string; date?: string }> {
  const messages: Array<{ sender: 'host' | 'guest'; text: string; date?: string }> = [];

  const lines = communication.split('\n');
  let currentDate = '';
  let currentSender: 'host' | 'guest' | null = null;
  let currentText = '';

  // Helper to save current message
  const saveCurrentMessage = () => {
    if (currentText.trim() && currentDate) {
      messages.push({
        sender: currentSender || 'guest',
        text: currentText.trim(),
        date: currentDate
      });
    }
    currentText = '';
    currentSender = null;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for German month name date format: "DD. Mon. YYYY - HH:MM"
    const germanDate = parseGermanDate(trimmedLine);
    if (germanDate) {
      // Save previous message before starting new one
      saveCurrentMessage();
      currentDate = germanDate;
      continue;
    }

    // Check if line is just a numeric date (DD.MM.YYYY)
    const dateOnlyMatch = trimmedLine.match(/^(\d{2}\.\d{2}\.\d{4})$/);
    if (dateOnlyMatch) {
      saveCurrentMessage();
      currentDate = dateOnlyMatch[1];
      continue;
    }

    // Check for inline date format: "DD.MM.YYYY HH:MM - ..."
    // Support different dash types: hyphen (-), en-dash (–), em-dash (—)
    const inlineDateMatch = trimmedLine.match(/^(\d{2}\.\d{2}\.\d{4}(?:\s+\d{2}:\d{2})?)\s*[-–—]\s*(.+)$/);
    if (inlineDateMatch) {
      saveCurrentMessage();
      currentDate = inlineDateMatch[1];
      const rest = inlineDateMatch[2];
      parseMessageContent(rest, currentDate, messages);
      continue;
    }

    // Check for message format: "XX - Name: Message" or "XX - Sie haben..."
    // Support different dash types: hyphen (-), en-dash (–), em-dash (—)
    const msgMatch = trimmedLine.match(/^\d+\s*[-–—]\s*(.+)$/);
    if (msgMatch) {
      parseMessageContent(msgMatch[1], currentDate, messages);
      continue;
    }

    // Accumulate text for current message
    // Determine sender from content patterns if not yet determined
    if (!currentSender) {
      // Host patterns: "Sehr geehrte/r ..." (host writing to guest), formal greeting
      // Guest patterns: responses, questions, etc.
      // Common host indicators: starts with formal greeting to guest
      if (/^Sehr geehrte/i.test(trimmedLine) || /^Liebe(?:r|s)?\s/i.test(trimmedLine)) {
        // This is the sender greeting the recipient - check if it mentions the owner name
        // If greeting mentions "Brenneisen" then it's likely from guest to host
        // If greeting doesn't mention owner, it's likely from host to guest
        if (/Brenneisen/i.test(trimmedLine)) {
          currentSender = 'guest';
        } else {
          currentSender = 'host';
        }
      } else if (/^Vielen Dank für Ihr/i.test(trimmedLine) || /^herzlich willkommen/i.test(trimmedLine)) {
        currentSender = 'host';
      } else if (/^Danke|^Hallo|^Guten Tag/i.test(trimmedLine)) {
        currentSender = 'guest';
      }
    }

    if (currentText) {
      currentText += '\n' + trimmedLine;
    } else {
      currentText = trimmedLine;
    }
  }

  // Don't forget the last message
  saveCurrentMessage();

  return messages;
}

interface CommunicationSectionProps {
  communication: string;
  communications?: Array<{
    date: string;
    time?: string;
    type: 'system' | 'guest' | 'host';
    event?: string;
    message?: string;
  }>;
}

export function CommunicationSection({ communication, communications }: CommunicationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out system events from communications array
  const fewoMessages = communications?.filter(c => c.type !== 'system' && c.message) || [];
  // Parse legacy string format
  const legacyMessages = parseCommunication(communication);
  // Use FeWo format if available, otherwise legacy
  const hasFewoMessages = fewoMessages.length > 0;
  const messageCount = hasFewoMessages ? fewoMessages.length : legacyMessages.length;

  return (
    <div className="bg-blue-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-900">Kommunikation</span>
          {messageCount > 0 && (
            <span className="text-xs text-gray-500">({messageCount} Nachrichten)</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="max-h-96 overflow-y-auto space-y-3 p-2">
            {hasFewoMessages ? (
              // FeWo format (communications array)
              fewoMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.type === 'host' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-xs text-gray-400 mb-1 px-1">
                    {formatDate(msg.date)}{msg.time ? ` ${msg.time}` : ''}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.type === 'host'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                  </div>
                </div>
              ))
            ) : legacyMessages.length > 0 ? (
              // Legacy format (parsed from string)
              legacyMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'host' ? 'items-end' : 'items-start'}`}
                >
                  {msg.date && (
                    <div className="text-xs text-gray-400 mb-1 px-1">
                      {msg.date}
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.sender === 'host'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                </div>
              ))
            ) : communication ? (
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-blue-100">
                {communication}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">Keine Kommunikation</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
