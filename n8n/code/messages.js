// Email texts in the four app languages. Shared by both workflows: the build
// script (build-workflows.mjs) inlines this file at the top of each
// "Compose email" Code node.
const MESSAGES = {
  en: {
    'loan.requested': { subject: (e) => `${e.other} wants to borrow your ${e.tool}`, body: (e) => `${e.other} asked to borrow your ${e.tool} from ${e.start} to ${e.end}. Open LendLoop to approve or decline the request.` },
    'loan.cancelled': { subject: (e) => `${e.other} cancelled a request`, body: (e) => `${e.other} cancelled the request for your ${e.tool} (${e.start} to ${e.end}).` },
    'loan.approved': { subject: (e) => `Approved: ${e.tool}`, body: (e) => `Good news: ${e.other} approved your request for the ${e.tool} from ${e.start} to ${e.end}.` },
    'loan.declined': { subject: (e) => `Request declined: ${e.tool}`, body: (e) => `Your request for the ${e.tool} (${e.start} to ${e.end}) was declined. Other tools may be available on LendLoop.` },
    'loan.returned': { subject: (e) => `Returned: ${e.tool}`, body: (e) => `${e.other} marked the ${e.tool} as returned. Thanks for borrowing responsibly!` },
    due_tomorrow_reminder: { subject: (e) => `Reminder: the ${e.tool} is due tomorrow`, body: (e) => `The ${e.tool} you borrowed from ${e.other} is due back tomorrow (${e.end}).` },
    overdue_reminder: { subject: (e) => `Overdue: please return the ${e.tool}`, body: (e) => `The ${e.tool} you borrowed from ${e.other} was due on ${e.end}. Please return it as soon as possible.` },
    greeting: (name) => `Hi ${name},`,
    footer: 'You receive this email because you use LendLoop.',
  },
  fr: {
    'loan.requested': { subject: (e) => `${e.other} souhaite emprunter votre ${e.tool}`, body: (e) => `${e.other} demande à emprunter votre ${e.tool} du ${e.start} au ${e.end}. Ouvrez LendLoop pour accepter ou refuser la demande.` },
    'loan.cancelled': { subject: (e) => `${e.other} a annulé une demande`, body: (e) => `${e.other} a annulé sa demande pour votre ${e.tool} (du ${e.start} au ${e.end}).` },
    'loan.approved': { subject: (e) => `Acceptée : ${e.tool}`, body: (e) => `Bonne nouvelle : ${e.other} a accepté votre demande pour ${e.tool} du ${e.start} au ${e.end}.` },
    'loan.declined': { subject: (e) => `Demande refusée : ${e.tool}`, body: (e) => `Votre demande pour ${e.tool} (du ${e.start} au ${e.end}) a été refusée. D'autres outils sont peut-être disponibles sur LendLoop.` },
    'loan.returned': { subject: (e) => `Rendu : ${e.tool}`, body: (e) => `${e.other} a marqué ${e.tool} comme rendu. Merci pour cet emprunt !` },
    due_tomorrow_reminder: { subject: (e) => `Rappel : ${e.tool} est à rendre demain`, body: (e) => `${e.tool}, emprunté à ${e.other}, est à rendre demain (${e.end}).` },
    overdue_reminder: { subject: (e) => `En retard : merci de rendre ${e.tool}`, body: (e) => `${e.tool}, emprunté à ${e.other}, devait être rendu le ${e.end}. Merci de le rendre au plus vite.` },
    greeting: (name) => `Bonjour ${name},`,
    footer: 'Vous recevez cet email car vous utilisez LendLoop.',
  },
  zh: {
    'loan.requested': { subject: (e) => `${e.other} 想借用您的 ${e.tool}`, body: (e) => `${e.other} 申请在 ${e.start} 至 ${e.end} 借用您的 ${e.tool}。请打开 LendLoop 批准或拒绝该申请。` },
    'loan.cancelled': { subject: (e) => `${e.other} 取消了申请`, body: (e) => `${e.other} 取消了借用您的 ${e.tool} 的申请（${e.start} 至 ${e.end}）。` },
    'loan.approved': { subject: (e) => `已批准：${e.tool}`, body: (e) => `好消息：${e.other} 批准了您在 ${e.start} 至 ${e.end} 借用 ${e.tool} 的申请。` },
    'loan.declined': { subject: (e) => `申请被拒绝：${e.tool}`, body: (e) => `您借用 ${e.tool}（${e.start} 至 ${e.end}）的申请被拒绝。LendLoop 上可能还有其他可用工具。` },
    'loan.returned': { subject: (e) => `已归还：${e.tool}`, body: (e) => `${e.other} 已将 ${e.tool} 标记为已归还。感谢您的借用！` },
    due_tomorrow_reminder: { subject: (e) => `提醒：${e.tool} 明天到期`, body: (e) => `您从 ${e.other} 借用的 ${e.tool} 明天（${e.end}）到期。` },
    overdue_reminder: { subject: (e) => `已逾期：请归还 ${e.tool}`, body: (e) => `您从 ${e.other} 借用的 ${e.tool} 应于 ${e.end} 归还。请尽快归还。` },
    greeting: (name) => `${name}，您好：`,
    footer: '您收到此邮件是因为您在使用 LendLoop。',
  },
  de: {
    'loan.requested': { subject: (e) => `${e.other} möchte dein ${e.tool} ausleihen`, body: (e) => `${e.other} möchte dein ${e.tool} vom ${e.start} bis ${e.end} ausleihen. Öffne LendLoop, um die Anfrage anzunehmen oder abzulehnen.` },
    'loan.cancelled': { subject: (e) => `${e.other} hat eine Anfrage storniert`, body: (e) => `${e.other} hat die Anfrage für dein ${e.tool} (${e.start} bis ${e.end}) storniert.` },
    'loan.approved': { subject: (e) => `Angenommen: ${e.tool}`, body: (e) => `Gute Nachricht: ${e.other} hat deine Anfrage für ${e.tool} vom ${e.start} bis ${e.end} angenommen.` },
    'loan.declined': { subject: (e) => `Anfrage abgelehnt: ${e.tool}`, body: (e) => `Deine Anfrage für ${e.tool} (${e.start} bis ${e.end}) wurde abgelehnt. Auf LendLoop gibt es vielleicht andere verfügbare Werkzeuge.` },
    'loan.returned': { subject: (e) => `Zurückgegeben: ${e.tool}`, body: (e) => `${e.other} hat ${e.tool} als zurückgegeben markiert. Danke fürs verantwortungsvolle Ausleihen!` },
    due_tomorrow_reminder: { subject: (e) => `Erinnerung: ${e.tool} ist morgen fällig`, body: (e) => `${e.tool}, ausgeliehen von ${e.other}, ist morgen (${e.end}) zurückzugeben.` },
    overdue_reminder: { subject: (e) => `Überfällig: bitte gib ${e.tool} zurück`, body: (e) => `${e.tool}, ausgeliehen von ${e.other}, war am ${e.end} fällig. Bitte gib es so bald wie möglich zurück.` },
    greeting: (name) => `Hallo ${name},`,
    footer: 'Du erhältst diese E-Mail, weil du LendLoop nutzt.',
  },
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Builds { to, subject, text, html } in the recipient's language (English fallback). */
function composeEmail(kind, recipient, vars) {
  const lang = MESSAGES[recipient.locale] ? recipient.locale : 'en';
  const t = MESSAGES[lang];
  const template = t[kind] || MESSAGES.en[kind];
  const subject = template.subject(vars);
  const body = template.body(vars);
  const greeting = t.greeting(recipient.firstName);
  return {
    to: recipient.email,
    subject,
    text: `${greeting}\n\n${body}\n\n— LendLoop\n${t.footer}`,
    html:
      `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2937;max-width:560px">` +
      `<p style="font-size:18px;font-weight:600;color:#065f46">LendLoop</p>` +
      `<p>${escapeHtml(greeting)}</p><p>${escapeHtml(body)}</p>` +
      `<p style="color:#6b7280;font-size:12px;margin-top:24px">${escapeHtml(t.footer)}</p></div>`,
  };
}
