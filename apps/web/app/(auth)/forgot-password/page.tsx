'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    try {
      await api.post('/auth/forgot-password', data);
      toast.success('Revisa tu correo para restablecer tu contraseña');
    } catch {
      toast.error('Error al enviar el correo');
    }
  };

  if (isSubmitSuccessful) {
    return (
      <div className="w-full max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-secondary">Revisa tu correo</h2>
        <p className="text-muted-foreground">Enviamos las instrucciones para restablecer tu contraseña.</p>
        <Link href="/login" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
          <ArrowLeft size={16} /> Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <Link href="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-secondary mb-6">
          <ArrowLeft size={16} /> Volver
        </Link>
        <h1 className="text-3xl font-bold text-secondary">Recuperar contraseña</h1>
        <p className="mt-2 text-muted-foreground">Ingresa tu email y te enviaremos las instrucciones.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="text-sm font-medium text-secondary">Email</label>
          <input {...register('email')} type="email" className="w-full mt-1 px-3 py-2.5 border border-border rounded-lg bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="tu@email.com" />
          {errors.email && <p className="text-sm text-danger mt-1">{errors.email.message as string}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60">
          {isSubmitting ? <><Loader2 size={18} className="animate-spin" />Enviando...</> : 'Enviar instrucciones'}
        </button>
      </form>
    </div>
  );
}
