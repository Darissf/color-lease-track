import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const WAHAInstallationSteps = () => {
  const { toast } = useToast();
  const [copiedSteps, setCopiedSteps] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSteps(prev => ({ ...prev, [stepId]: true }));
    toast({ title: 'Disalin!', description: 'Command berhasil disalin ke clipboard' });
    setTimeout(() => setCopiedSteps(prev => ({ ...prev, [stepId]: false })), 2000);
  };

  const steps = [
    {
      id: 'step1',
      title: 'Persiapan VPS',
      description: 'Pastikan VPS Anda memenuhi spesifikasi minimum',
      requirements: [
        'Ubuntu 20.04+ / Debian 11+ / CentOS 8+',
        'RAM minimal 1GB (recommended 2GB)',
        'Storage minimal 10GB',
        'Port 3000 terbuka untuk WAHA API',
        'Akses root atau sudo privileges'
      ],
      commands: []
    },
    {
      id: 'step2',
      title: 'Instalasi Docker',
      description: 'Install Docker dan Docker Compose di VPS',
      commands: [
        {
          label: 'Update system packages',
          code: 'sudo apt update && sudo apt upgrade -y'
        },
        {
          label: 'Install Docker',
          code: 'curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh'
        },
        {
          label: 'Start Docker service',
          code: 'sudo systemctl start docker && sudo systemctl enable docker'
        },
        {
          label: 'Verify Docker installation',
          code: 'docker --version'
        }
      ]
    },
    {
      id: 'step3',
      title: 'Setup WAHA dengan Docker Compose',
      description: 'Buat file konfigurasi dan jalankan WAHA container',
      commands: [
        {
          label: 'Buat direktori untuk WAHA',
          code: 'mkdir -p ~/waha && cd ~/waha'
        },
        {
          label: 'Buat file docker-compose.yml',
          code: 'nano docker-compose.yml',
          note: 'Gunakan Config Generator untuk generate file ini, lalu paste isinya'
        },
        {
          label: 'Jalankan WAHA container',
          code: 'docker-compose up -d'
        },
        {
          label: 'Cek status container',
          code: 'docker-compose ps'
        },
        {
          label: 'Lihat logs (optional)',
          code: 'docker-compose logs -f waha'
        }
      ]
    },
    {
      id: 'step4',
      title: 'Scan QR Code WhatsApp',
      description: 'Hubungkan WhatsApp dengan WAHA',
      commands: [
        {
          label: 'Pastikan WAHA sudah running',
          code: 'curl http://localhost:3000/api/health'
        }
      ],
      note: 'Setelah WAHA running, gunakan tab "QR Code" untuk scan QR dan hubungkan WhatsApp Anda'
    },
    {
      id: 'step5',
      title: 'Konfigurasi di Aplikasi',
      description: 'Simpan kredensial WAHA di aplikasi',
      steps: [
        'Kembali ke tab "Konfigurasi"',
        'Isi WAHA API URL dengan format: http://IP_VPS_ANDA:3000',
        'Isi API Key sesuai yang Anda generate',
        'Isi Session Name (default: default)',
        'Aktifkan toggle "WhatsApp Notifications Active"',
        'Klik "Test Connection" untuk memverifikasi',
        'Jika berhasil, klik "Simpan Konfigurasi"'
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-blue-500">Info Penting</p>
            <p className="text-sm text-muted-foreground">
              Pastikan Anda memiliki akses SSH ke VPS dan kemampuan untuk menjalankan command sebagai root/sudo.
              Proses ini memerlukan waktu sekitar 10-15 menit untuk setup awal.
            </p>
          </div>
        </div>
      </Card>

      <Accordion type="single" collapsible className="w-full space-y-2">
        {steps.map((step) => (
          <AccordionItem key={step.id} value={step.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-start gap-3 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                  {step.id.replace('step', '')}
                </div>
                <div>
                  <h4 className="font-semibold">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-2">
              <div className="space-y-4 pl-11">
                {step.requirements && (
                  <div>
                    <p className="font-medium mb-2">Requirements:</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {step.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span>•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {step.commands && step.commands.length > 0 && (
                  <div className="space-y-3">
                    {step.commands.map((cmd, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-sm font-medium">{cmd.label}</p>
                        <div className="relative group">
                          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                            <code>{cmd.code}</code>
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-7 w-7 p-0"
                            onClick={() => copyToClipboard(cmd.code, `${step.id}-${idx}`)}
                          >
                            {copiedSteps[`${step.id}-${idx}`] ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        {cmd.note && (
                          <p className="text-xs text-muted-foreground italic">{cmd.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {step.steps && (
                  <ol className="space-y-2 text-sm">
                    {step.steps.map((s, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-medium">{idx + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                )}

                {step.note && (
                  <Card className="p-3 bg-muted/50 border-primary/20">
                    <p className="text-sm">{step.note}</p>
                  </Card>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
