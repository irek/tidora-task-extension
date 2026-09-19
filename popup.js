(async () => {
	const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
	initTaskForm(
		{ title: tab?.title || '', description: '', email_url: tab?.url || '' },
		{ closeOnSuccess: true }
	);
})();
