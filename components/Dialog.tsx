'use client'

import { useState } from 'react'

type DialogState = {
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  resolve: (value: boolean) => void
}

type DialogProps = {
  isOpen: boolean
  message: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export function Dialog({ isOpen, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: DialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xs bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed text-center">{message}</p>
        </div>
        <div className={`flex border-t border-gray-100 dark:border-gray-800 ${cancelLabel ? '' : ''}`}>
          {cancelLabel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-r border-gray-100 dark:border-gray-800"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              danger ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [state, setState] = useState<DialogState | null>(null)

  const confirm = (
    message: string,
    options?: { confirmLabel?: string; cancelLabel?: string; danger?: boolean }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        message,
        confirmLabel: options?.confirmLabel ?? '확인',
        cancelLabel: options?.cancelLabel ?? '취소',
        danger: options?.danger,
        resolve,
      })
    })
  }

  const alert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        message,
        confirmLabel: '확인',
        danger: false,
        resolve: () => resolve(),
      })
    })
  }

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  const dialogProps: DialogProps = state
    ? {
        isOpen: true,
        message: state.message,
        confirmLabel: state.confirmLabel,
        cancelLabel: state.cancelLabel,
        danger: state.danger,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      }
    : {
        isOpen: false,
        message: '',
        confirmLabel: '',
        onConfirm: () => {},
      }

  return { confirm, alert, dialogProps }
}
