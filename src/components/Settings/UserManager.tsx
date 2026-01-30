import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ALLOWED_EMAILS, isQAEmail } from '@/lib/authUtils';
import { User, Shield, Bot, CheckCircle2 } from 'lucide-react';

export const UserManager = () => {
    const users = ALLOWED_EMAILS.map(email => ({
        email,
        isQA: isQAEmail(email),
        name: email === 'michaelmullally@gmail.com' ? 'Michael Mullally' :
            email === 'tanjen2@gmail.com' ? 'Tanja Jensen' :
                isQAEmail(email) ? (email.startsWith('qa') ? 'QA Specialist' : 'Automation Bot') : 'Unknown'
    }));

    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-4 border-b bg-slate-50/50">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-semibold text-slate-800">Authorized Users</CardTitle>
                        <CardDescription>Manage who can access the shared household account.</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                        <Shield className="w-3 h-3" /> Restricted Access
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {users.map((user) => (
                        <div key={user.email} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.isQA ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {user.isQA ? (user.name.includes('Bot') ? <Bot className="w-5 h-5" /> : <Shield className="w-5 h-5" />) : <User className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-slate-900">{user.name}</p>
                                        {user.email === 'michaelmullally@gmail.com' && (
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-[10px] h-4">Owner</Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {user.isQA ? (
                                    <Badge className="bg-purple-500 hover:bg-purple-600 text-[10px] px-2 py-0">
                                        QA/Automation
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-2 py-0 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Live User
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex gap-2 items-start text-[11px] text-slate-500">
                        <Shield className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                        <p>
                            Access is strictly restricted to the emails listed above via Google OAuth.
                            QA accounts are for validation purposes only and must be disabled before final production deployment.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
