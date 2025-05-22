import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MessageSquare, 
  Send, 
  Lightbulb, 
  Bug, 
  Sparkles, 
  HelpCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const FeedbackPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState<'suggestion' | 'bug' | 'feature' | 'other'>('suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Check if user is logged in
  React.useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Get user profile to pre-fill name and email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, first_name, last_name, name')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setEmail(profile.email || '');
          
          // Use first_name and last_name if available, otherwise use name
          if (profile.first_name && profile.last_name) {
            setName(`${profile.first_name} ${profile.last_name}`);
          } else {
            setName(profile.name || '');
          }
        }
      }
    };
    
    checkUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill out all required fields');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Submit feedback to database
      const { error: submitError } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id || null,
          name,
          email,
          feedback_type: feedbackType,
          message
        });
        
      if (submitError) throw submitError;
      
      // Show success message
      setSuccess(true);
      
      // Reset form after 3 seconds and redirect
      setTimeout(() => {
        navigate('/about');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFeedbackTypeIcon = () => {
    switch (feedbackType) {
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-yellow-400" />;
      case 'bug':
        return <Bug className="w-5 h-5 text-red-400" />;
      case 'feature':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'other':
        return <HelpCircle className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button 
              onClick={() => navigate('/about')}
              className="flex items-center mr-4 text-gold hover:text-gold/80 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gold">Feedback & Suggestions</h1>
          </div>

          {/* Success Message */}
          {success ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-900/30 border border-green-500/50 rounded-xl p-6 text-center"
            >
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
              <p className="text-gray-300 mb-4">
                Your feedback has been submitted successfully. We appreciate your input!
              </p>
              <p className="text-gray-400">
                Redirecting you back to the About page...
              </p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 rounded-xl border border-gold/30 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center">
                  <MessageSquare className="text-gold mr-3" size={24} />
                  <h2 className="text-xl font-bold text-white">Share Your Thoughts</h2>
                </div>
                <p className="text-gray-400 mt-2">
                  We value your feedback and suggestions to improve ULimo. Let us know what you think!
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mx-6 mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-800 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                    placeholder="Enter your name"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800 text-white py-2 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                {/* Feedback Type */}
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">
                    Feedback Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => setFeedbackType('suggestion')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                        feedbackType === 'suggestion' 
                          ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Lightbulb className="w-6 h-6 mb-2" />
                      <span className="text-sm">Suggestion</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType('bug')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                        feedbackType === 'bug' 
                          ? 'bg-red-900/30 border-red-500/50 text-red-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Bug className="w-6 h-6 mb-2" />
                      <span className="text-sm">Bug Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType('feature')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                        feedbackType === 'feature' 
                          ? 'bg-purple-900/30 border-purple-500/50 text-purple-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Sparkles className="w-6 h-6 mb-2" />
                      <span className="text-sm">Feature Request</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackType('other')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
                        feedbackType === 'other' 
                          ? 'bg-blue-900/30 border-blue-500/50 text-blue-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <HelpCircle className="w-6 h-6 mb-2" />
                      <span className="text-sm">Other</span>
                    </button>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">
                    Your Message <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3">
                      {getFeedbackTypeIcon()}
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      className="w-full bg-gray-800 text-white py-3 pl-10 pr-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold border border-gray-700"
                      placeholder="Tell us your thoughts, ideas, or report an issue..."
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold hover:bg-yellow-400 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};