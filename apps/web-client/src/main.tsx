import React, { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router.tsx';
import './assets/css/main.css';
import { Provider } from 'react-redux';
import { store } from './store/index.ts';
import { fetchProfile } from './store/slices/user.slice';
import { useAppDispatch } from './store/hooks';
import '@fontsource-variable/spline-sans-mono';
import { createRoot } from 'react-dom/client';
import { cipher } from '@/crypto/new-cipher.ts';
import { AppEvent } from '@/shared/event-bus';
import { AuthProvider } from '@/context/AuthContext.tsx';

window.global = window;

export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
	const dispatch = useAppDispatch();

	useEffect(() => {
		cipher.init();

		const onNewSharedKey = (data: { id: string; sharedKey: string }) => {
			cipher.registerPeerPublicKey(data.id, data.sharedKey);
		};
		AppEvent.listen('cipher:new-shared-key', onNewSharedKey);

		return () => {
			AppEvent.off('cipher:new-shared-key', onNewSharedKey);
		};
	}, []);

	useEffect(() => {
		const token = localStorage.getItem('auth-token');
		if (token) {
			dispatch(fetchProfile());
		}
	}, [dispatch]);

	return <AuthProvider>{children}</AuthProvider>;
};

const container = document.getElementById('root')!;

if (!container?.hasChildNodes()) {
	const root = createRoot(container);
	root.render(
		// <React.StrictMode>
		<Provider store={store}>
			<AppInitializer>
				<Suspense fallback={<div>Loading...</div>}>
					<RouterProvider router={router} />
				</Suspense>
			</AppInitializer>
		</Provider>
		// </React.StrictMode>
	);
}
