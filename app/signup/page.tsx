'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SignupPage() {
  const router = useRouter();

  // Name & Auth
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Contact & Demographic
  const [phone, setPhone] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Address
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Emergency Contact
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setErrorMsg('Please complete all required fields (*).');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          middleInitial,
          email,
          password,
          phone,
          homePhone,
          birthDate,
          addressLine,
          city,
          stateProvince,
          country,
          postalCode,
          emergencyContact,
          emergencyPhone,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setErrorMsg(body.error?.message || 'Registration failed');
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrorMsg('Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-sm">
        <CardHeader className="text-center space-y-2 pb-6 border-b border-slate-800">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 mb-2 border border-blue-500/30 font-bold text-lg">
            DM
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            PADI DMT Registration
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Candidate Information and Evaluation Form Registration
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <Alert variant="destructive" className="border-red-900/50 bg-red-950/50 text-red-200 text-sm">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* Section 1: Account Credentials */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1">
                Account Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-200 text-xs">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dmt@example.com"
                    required
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-200 text-xs">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Personal Name */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1">
                Personal Name
              </h3>
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="first-name" className="text-slate-200 text-xs">First Name *</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    required
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="last-name" className="text-slate-200 text-xs">Last Name *</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    required
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>

                <div className="col-span-1 space-y-1.5">
                  <Label htmlFor="middle-initial" className="text-slate-200 text-xs">M.I.</Label>
                  <Input
                    id="middle-initial"
                    value={middleInitial}
                    onChange={(e) => setMiddleInitial(e.target.value)}
                    placeholder="J"
                    maxLength={2}
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10 text-center uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Contact & Demographics */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1">
                Contact & Demographics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-slate-200 text-xs">Mobile Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="home-phone" className="text-slate-200 text-xs">Home Phone</Label>
                  <Input
                    id="home-phone"
                    value={homePhone}
                    onChange={(e) => setHomePhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birth-date" className="text-slate-200 text-xs">Birth Date</Label>
                  <Input
                    id="birth-date"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Address Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1">
                Mailing Address
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="address-line" className="text-slate-200 text-xs">Street Address</Label>
                  <Input
                    id="address-line"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="123 Ocean Drive"
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-slate-200 text-xs">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Miami"
                      className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-slate-200 text-xs">State/Province</Label>
                    <Input
                      id="state"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder="FL"
                      className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-slate-200 text-xs">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="USA"
                      className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="postal-code" className="text-slate-200 text-xs">Zip/Postal Code</Label>
                    <Input
                      id="postal-code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="33101"
                      className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Contact */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 border-b border-slate-800/80 pb-1">
                Emergency Contact Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="emerg-contact" className="text-slate-200 text-xs">Emergency Contact Name</Label>
                  <Input
                    id="emerg-contact"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Jane Smith"
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emerg-phone" className="text-slate-200 text-xs">Emergency Contact Phone</Label>
                  <Input
                    id="emerg-phone"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="(555) 999-8888"
                    className="bg-slate-950 border-slate-800 text-slate-100 h-10"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base shadow-lg mt-4"
            >
              {isLoading ? 'Creating Account...' : 'Complete DMT Registration'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-800/80 pt-4 text-xs text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="text-blue-400 font-semibold hover:underline ml-1">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
