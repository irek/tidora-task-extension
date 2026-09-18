(async () => {
	const id = new URLSearchParams(location.search).get('id');
	const stored = id ? await chrome.storage.session.get(id) : {};
	const prefill = stored[id] || { title: '', description: '', email_url: '' };
	if (id) chrome.storage.session.remove(id);
	initTaskForm(prefill, { closeOnSuccess: true });
})();
