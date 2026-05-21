'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

const registerSchema = z.object({
  clubName: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  clubSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  adminFirstName: z.string().min(1).max(50),
  adminLastName: z.string().min(1).max(50),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.adminPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login } = useAuthStore();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const clubName = watch('clubName');

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const onSubmit = async (data: RegisterForm) => {
    try {
      const { confirmPassword, ...payload } = data;
      const response = await api.post('/auth/register', payload);
      const { user, accessToken } = response.data.data;
      login(user, accessToken);
      toast.success('¡Club registrado exitosamente!');
      router.push('/admin');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Error al registrar');
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">B</div>
          <span className="text-xl font-bold text-secondary">BasketPass</span>
        </div>
        <h1 className="text-3xl font-bold text-secondary">Registrar club</h1>
        <p className="mt-2 text-muted-foreground">Crea tu cuenta y empieza a gestionar tu club</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-semibold text-secondary mb-3">Información del club</legend>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-secondary">Nombre del club</label>
              <input
                {...register('clubName', {
                  onChange: (e) => setValue('clubSlug', generateSlug(e.target.value)),
                })}
                className="w-full mt-1 px-3 py-2.5 border border-border rounded-lg bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition"
                placeholder="Club Atlético Basket"
              />
              {errors.clubName && <p className="text-sm text-danger mt-1">{errors.clubName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-secondary">Slug del club</label>
              <div className="flex mt-1">
                <span className="inline-flex items-center px-3 border border-r-0 border-border rounded-l-lg bg-muted text-muted-foreground text-sm">
                  basketpass.app/
                </span>
                <input
                  {...register('clubSlug')}
                  className="flex-1 px-3 py-2.5 border border-border rounded-r-lg bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition"
                  placeholder="mi-club"
                />
              </div>
              {errors.clubSlug && <p className="text-sm text-danger mt-1">{errors.clubSlug.message}</p>}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-secondary mb-3">Administrador del club</legend>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-secondary">Nombre</label>
                <input {...register('adminFirstName')} className="w-full mt-1 px-3 py-2.5 border border-border rounded-lg bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="Juan" />
                {errors.adminFirstName && <p className="text-sm text-danger mt-1">{errors.adminFirstName.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-secondary">Apellido</label>
                <input {...register('adminLastName')} className="w-full mt-1 px-3 py-2.5 border border-border rounded-lg bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="García" />
                {errors.adminLastName && <p className="text-sm text-danger mt-1">{errors.adminLastName.message}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary">Email</label>
              <input {...register('adminEmail')} type="email" className="w-full mt-1 px-3 py-2.5 border border-border rounded-lg bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="admin@miclub.com" />
              {errors.adminEmail && <p className="text-sm text-danger mt-1">{errors.adminEmail.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-secondary">Contraseña</label>
              <div className="relative mt-1">
                <input {...register('adminPassword')} type={showPassword ? 'text' : 'password'} className="w-full px-3 py-2.5 pr-10 border border-border rounded-lg bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.adminPassword && <p className="text-sm text-danger mt-1">{errors.adminPassword.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-secondary">Confirmar contraseña</label>
              <input {...register('confirmPassword')} type="password" className="w-full mt-1 px-3 py-2.5 border border-border rounded-lg bg-surface text-secondary focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="••••••••" />
              {errors.confirmPassword && <p className="text-sm text-danger mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>
        </fieldset>

        <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-60">
          {isSubmitting ? <><Loader2 size={18} className="animate-spin" />Registrando...</> : 'Registrar club'}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">Iniciar sesión</Link>
        </p>
      </form>
    </div>
  );
}
