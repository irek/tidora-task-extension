(async () => {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	initTaskForm(
		{ title: tab?.title || '', description: '', email_url: tab?.url || '' },
		{ closeOnSuccess: true }
	);
})();
