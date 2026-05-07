import { Toast as BaseToast } from '@base-ui/react/toast';

// Separated from Toast.tsx so the file containing components doesn't
// also export this non-component hook (react-refresh HMR rule).
export const useToastManager = BaseToast.useToastManager;
