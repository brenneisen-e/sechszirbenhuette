'use client';

import { Loader2, Save, X, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Booking } from './types';
import { useBookingForm } from './edit-booking/useBookingForm';
import { Stepper } from './edit-booking/Stepper';
import { Step1 } from './edit-booking/Step1';
import { Step2 } from './edit-booking/Step2';
import { Step3 } from './edit-booking/Step3';

// ============================================================================
// WICHTIG: Keine Finanzberechnungen in dieser Komponente!
// Alle Berechnungen erfolgen zentral in lib/utils/financeCalculations.ts
// Diese Komponente zeigt nur die Ergebnisse an.
// ============================================================================

interface EditBookingModalProps {
  booking: Booking;
  isSubmitting: boolean;
  adminPassword?: string;
  onClose: () => void;
  onSave: (booking: Partial<Booking> & { id: number }, uploadedFile?: File, guestUpdates?: { address?: string }) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function EditBookingModal({
  booking,
  isSubmitting,
  adminPassword,
  onClose,
  onSave,
  onSuccess,
  onError,
}: EditBookingModalProps) {
  const form = useBookingForm({ booking, onSuccess, onError });

  const handleSubmit = () => {
    const { bookingData, uploadedFile, guestUpdates } = form.buildSubmitData();
    onSave(bookingData, uploadedFile, guestUpdates);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100">
          <h2 className="text-xl font-bold text-gray-900">
            {booking.id ? 'Buchung bearbeiten' : 'Neue Buchung'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Stepper
            currentStep={form.currentStep}
            canProceedStep1={form.canProceedStep1}
            onStepClick={(step) => form.setCurrentStep(step)}
          />

          {form.currentStep === 1 && (
            <Step1
              platform={form.platform}
              setPlatform={form.setPlatform}
              bookingNumber={form.bookingNumber}
              setBookingNumber={form.setBookingNumber}
              arrivalDate={form.arrivalDate}
              setArrivalDate={form.setArrivalDate}
              departureDate={form.departureDate}
              setDepartureDate={form.setDepartureDate}
              adults={form.adults}
              setAdults={form.setAdults}
              children={form.children}
              setChildren={form.setChildren}
              pets={form.pets}
              setPets={form.setPets}
              nights={form.nights}
              isAnalyzing={form.isAnalyzing}
              fileInputRef={form.fileInputRef}
              analyzeFile={form.analyzeFile}
            />
          )}

          {form.currentStep === 2 && (
            <Step2
              platformType={form.platformType}
              hasDog={form.hasDog}
              payoutAmount={form.payoutAmount}
              setPayoutAmount={form.setPayoutAmount}
              setRentalPrice={form.setRentalPrice}
              cleaningCash={form.cleaningCash}
              setCleaningCash={form.setCleaningCash}
              utilitiesCash={form.utilitiesCash}
              setUtilitiesCash={form.setUtilitiesCash}
              showBookingFees={form.showBookingFees}
              setShowBookingFees={form.setShowBookingFees}
              guestTotalStr={form.guestTotalStr}
              setGuestTotalStr={form.setGuestTotalStr}
              serviceFeeStr={form.serviceFeeStr}
              setServiceFeeStr={form.setServiceFeeStr}
              processingFeeStr={form.processingFeeStr}
              setProcessingFeeStr={form.setProcessingFeeStr}
              guestTotalPayment={form.guestTotalPayment}
              platformServiceFee={form.platformServiceFee}
              paymentProcessingFee={form.paymentProcessingFee}
              extractedPayoutDate={form.extractedPayoutDate}
              setExtractedPayoutDate={form.setExtractedPayoutDate}
              syncFeeValues={form.syncFeeValues}
              rentalPrice={form.rentalPrice}
              setRentalPrice2={form.setRentalPrice}
              nebenkostenIncome={form.nebenkostenIncome}
              setNebenkostenIncome={form.setNebenkostenIncome}
              cleaningFeeIncome={form.cleaningFeeIncome}
              setCleaningFeeIncome={form.setCleaningFeeIncome}
              setPaymentProcessingFee={form.setPaymentProcessingFee}
              isPrivate={form.isPrivate}
              adults={form.adults}
              komfortpaketEnabled={form.komfortpaketEnabled}
              setKomfortpaketEnabled={form.setKomfortpaketEnabled}
              komfortpaketPersons={form.komfortpaketPersons}
              setKomfortpaketPersons={form.setKomfortpaketPersons}
              komfortpaketGuestPaid={form.komfortpaketGuestPaid}
              setKomfortpaketGuestPaid={form.setKomfortpaketGuestPaid}
              komfortpaketPricePerPerson={form.komfortpaketPricePerPerson}
              setKomfortpaketPricePerPerson={form.setKomfortpaketPricePerPerson}
              komfortpaketPriceStr={form.komfortpaketPriceStr}
              setKomfortpaketPriceStr={form.setKomfortpaketPriceStr}
              financeResult={form.financeResult}
            />
          )}

          {form.currentStep === 3 && (
            <Step3
              platform={form.platform}
              platformType={form.platformType}
              bookingNumber={form.bookingNumber}
              arrivalDate={form.arrivalDate}
              departureDate={form.departureDate}
              nights={form.nights}
              adults={form.adults}
              children={form.children}
              hasDog={form.hasDog}
              rentalPrice={form.rentalPrice}
              nebenkostenIncome={form.nebenkostenIncome}
              cleaningFeeIncome={form.cleaningFeeIncome}
              utilitiesCash={form.utilitiesCash}
              cleaningCash={form.cleaningCash}
              depositPaid={form.depositPaid}
              setDepositPaid={form.setDepositPaid}
              finalPaymentPaid={form.finalPaymentPaid}
              setFinalPaymentPaid={form.setFinalPaymentPaid}
              depositAmount={form.depositAmount}
              setDepositAmount={form.setDepositAmount}
              status={form.status}
              setStatus={form.setStatus}
              notes={form.notes}
              setNotes={form.setNotes}
              financeResult={form.financeResult}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          {form.currentStep > 1 ? (
            <button
              type="button"
              onClick={form.prevStep}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Abbrechen
            </button>
          )}

          {form.currentStep < 3 ? (
            <button
              type="button"
              onClick={form.nextStep}
              disabled={form.currentStep === 1 && !form.canProceedStep1}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Buchung speichern
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
