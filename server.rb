require 'sinatra'
set :bind, '0.0.0.0'
set :public_folder, './'
get '/' do send_file 'index.html' end
